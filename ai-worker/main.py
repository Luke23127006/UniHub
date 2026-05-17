import os
import json
import time
import logging
import re
import fitz
import pika
import requests
import google.generativeai as genai
from dotenv import load_dotenv

# Initialize logging configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ai_worker")

load_dotenv()

# App environment variables
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
BACKEND_URL = os.getenv("BACKEND_INTERNAL_URL", "http://backend:3000/api/v1/ai/internal")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
QUEUE_NAME = "ai_summary_tasks"

# Initialize Google AI library
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    logger.error("GOOGLE_API_KEY environment variable is missing")

def clean_text(text: str) -> str:
    # Normalize text by removing non-printable characters and extra whitespace
    text = "".join(c for c in text if c.isprintable() or c in "\n\r\t")
    return re.sub(r'\s+', ' ', text).strip()

def extract_pdf_content(file_path: str) -> str:
    # Extract text from PDF file using PyMuPDF
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found: {file_path}")

    doc = fitz.open(file_path)
    full_text = [page.get_text("text") for page in doc]
    doc.close()

    content = clean_text("\n".join(full_text))
    return content[:15000] if len(content) > 15000 else content

def generate_summary(text: str) -> dict:
    # Generate workshop summary and extract structured info using available Gemini models
    models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest", "gemini-pro-latest"]
    prompt = f"""
    Analyze the following workshop content and provide:
    1. A summary in Vietnamese (150-200 words).
    2. A suggested catchy title.
    3. The main speaker's name.

    Return the result as a JSON object with keys: "summary", "suggested_title", "speaker_name".
    
    Content:
    {text}
    """
    
    for model_name in models:
        try:
            logger.info(f"Attempting analysis with model: {model_name}")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
            if response.text:
                return json.loads(response.text)
        except Exception as e:
            logger.warning(f"Model {model_name} failed: {str(e)}")
    
    raise RuntimeError("Failed to generate summary with any available model")

def report_to_backend(task_type, job_id, data):
    # Send processing results back to the backend service
    try:
        if task_type == "analyze_pdf":
            # Temporary extraction job
            # Remove "api/v1/ai/internal" from BACKEND_URL to use relative paths if needed, but BACKEND_URL is already "http://backend:3000/api/v1/ai/internal"
            url = f"{BACKEND_URL}/jobs/{job_id}"
        else:
            # Persistent summary record
            url = f"{BACKEND_URL}/ai-summaries/{job_id}"
            
        requests.patch(url, json=data, timeout=10).raise_for_status()
        logger.info(f"Successfully updated backend for {task_type} {job_id}")
    except Exception as e:
        logger.error(f"Failed to notify backend for {task_type} {job_id}: {str(e)}")

def process_task(ch, method, properties, body):
    # Handle incoming RabbitMQ message
    try:
        data = json.loads(body)
        task_type = data.get("task_type", "summary")
        path = data.get("file_path")
        
        # Translate the docker volume path
        # Backend saves at /usr/src/app/data/uploads/...
        # AI Worker mounts it at /app/backend/data/uploads/...
        if path and path.startswith("/usr/src/app/data"):
            path = path.replace("/usr/src/app/data", "/app/backend/data")
            
        if task_type == "analyze_pdf":
            job_id = data.get("job_id")
        else:
            job_id = data.get("summary_id")
            
        logger.info(f"Starting {task_type} task ID: {job_id}")

        content = extract_pdf_content(path)
        if len(content) < 20:
            raise ValueError("Extracted text is empty or too short")

        result = generate_summary(content)
        report_to_backend(task_type, job_id, {
            "status": "completed", 
            "raw_text": content, 
            "summary_text": result.get("summary"),
            "suggested_title": result.get("suggested_title"),
            "speaker_name": result.get("speaker_name")
        })
        logger.info(f"Task completed successfully: {job_id}")

    except Exception as e:
        logger.error(f"Task failed: {str(e)}")
        if 'job_id' in locals() and 'task_type' in locals():
            report_to_backend(task_type, job_id, {"status": "failed", "last_error": str(e)})
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)

def start_worker():
    # Initialize RabbitMQ connection with retry logic
    connection = None
    for i in range(1, 11):
        try:
            connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
            break
        except Exception:
            logger.info(f"Waiting for RabbitMQ... (Attempt {i}/10)")
            time.sleep(5)

    if not connection:
        logger.error("Failed to connect to RabbitMQ after 10 attempts")
        return

    channel = connection.channel()
    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=process_task)

    logger.info("AI Worker is active and waiting for tasks")
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        connection.close()

if __name__ == "__main__":
    start_worker()
