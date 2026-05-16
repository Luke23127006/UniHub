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

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ai_worker")

load_dotenv()

# App Constants
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
BACKEND_URL = os.getenv("BACKEND_INTERNAL_URL", "http://backend:3000/api/v1/ai/internal")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
QUEUE_NAME = "ai_summary_tasks"

# Initialize Google AI
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    logger.error("GOOGLE_API_KEY not found")

def clean_text(text: str) -> str:
    """Clean text while preserving Unicode/Vietnamese characters"""
    text = "".join(char for char in text if char.isprintable() or char in "\n\r\t")
    return re.sub(r'\s+', ' ', text).strip()

def extract_pdf_content(file_path: str) -> str:
    """Extract text from PDF with multiple fallback modes"""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    doc = fitz.open(file_path)
    full_text = []
    for page in doc:
        text = page.get_text("text") or " ".join([b[4] for b in page.get_text("blocks")])
        full_text.append(text)
    doc.close()

    cleaned = clean_text("\n".join(full_text))
    return (cleaned[:15000] + "...") if len(cleaned) > 15000 else cleaned

def generate_summary(text: str) -> str:
    """Generate summary using available Gemini models with fallback"""
    models = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-pro-latest"]
    
    prompt = f"Summarize the following workshop content professionally in Vietnamese (150-200 words):\n\n{text}"
    
    for model_name in models:
        try:
            logger.info(f"Using model: {model_name}")
            model = genai.GenerativeModel(model_name)
            return model.generate_content(prompt).text
        except Exception as e:
            logger.warning(f"Model {model_name} failed: {e}")
    
    raise Exception("All AI models failed")

def report_to_backend(summary_id, data):
    """Send processing results back to backend"""
    url = f"{BACKEND_URL}/ai-summaries/{summary_id}"
    try:
        requests.patch(url, json=data, timeout=10).raise_for_status()
        logger.info(f"Backend updated for task {summary_id}")
    except Exception as e:
        logger.error(f"Backend update failed: {e}")

def process_task(ch, method, properties, body):
    """Handle incoming RabbitMQ messages"""
    try:
        data = json.loads(body)
        sid, path = data.get("summary_id"), data.get("file_path")
        logger.info(f"Task started: ID={sid}")

        # Extract content
        content = extract_pdf_content(path)
        if len(content) < 10:
            raise ValueError("Empty or scanned PDF")

        # Generate summary
        summary = generate_summary(content)
        
        # Report success
        report_to_backend(sid, {"status": "completed", "raw_text": content, "summary_text": summary})
        logger.info(f"Task success: ID={sid}")

    except Exception as e:
        logger.error(f"Task error: {e}")
        if 'sid' in locals():
            report_to_backend(sid, {"status": "failed", "last_error": str(e)})
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)

def start_worker():
    """Main worker entry point"""
    conn = None
    for i in range(10): # Retry connection
        try:
            conn = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
            break
        except:
            logger.info("Waiting for RabbitMQ...")
            time.sleep(5)

    if not conn: return

    channel = conn.channel()
    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=process_task)

    logger.info("Worker is ready")
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        conn.close()

if __name__ == "__main__":
    start_worker()
