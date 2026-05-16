import os
import json
import time
import logging
import re
import fitz  # PyMuPDF
import pika
import requests
import google.generativeai as genai
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ai_worker")

load_dotenv()

# Configuration from environment variables
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
BACKEND_INTERNAL_URL = os.getenv("BACKEND_INTERNAL_URL", "http://backend:3000/api/internal")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
QUEUE_NAME = "ai_summary_tasks"

# Initialize Gemini
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
else:
    logger.warning("GOOGLE_API_KEY not found. AI features will fail.")

def clean_text(text: str) -> str:
    """Clean extracted text from PDF."""
    # Remove non-printable characters
    text = re.sub(r'[^\w\s\d\.\,\!\?\(\)\-\:\/]', '', text)
    # Replace multiple whitespaces/newlines with a single space
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def process_pdf(file_path):
    """Extract and clean text from PDF file."""
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        doc = fitz.open(file_path)
        full_text = ""
        for page in doc:
            full_text += page.get_text()
        doc.close()

        cleaned_text = clean_text(full_text)
        
        # Limit text length to avoid token limits (approx 15k chars)
        if len(cleaned_text) > 15000:
            cleaned_text = cleaned_text[:15000] + "..."
            
        return cleaned_text
    except Exception as e:
        logger.error(f"Error parsing PDF {file_path}: {str(e)}")
        raise

def get_ai_summary(text):
    """Call Gemini API to generate summary."""
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY is missing")

    prompt = f"""
    Bạn là một trợ lý AI chuyên nghiệp cho dự án UniHub Workshop. 
    Hãy tóm tắt nội dung văn bản dưới đây một cách chuyên nghiệp và súc tích (khoảng 150-200 chữ).
    Yêu cầu bản tóm tắt phải làm nổi bật:
    - Mục tiêu/Giá trị cốt lõi của workshop.
    - Đối tượng sinh viên nên tham gia.
    - Các nội dung chính hoặc kỹ năng sẽ đạt được.

    Văn bản gốc trích xuất từ PDF:
    {text}
    """
    
    response = model.generate_content(prompt)
    return response.text

def update_backend(summary_id, data):
    """Send results back to Node.js backend."""
    url = f"{BACKEND_INTERNAL_URL}/ai-summaries/{summary_id}"
    try:
        response = requests.patch(url, json=data, timeout=10)
        response.raise_for_status()
        logger.info(f"Successfully updated backend for summary_id: {summary_id}")
    except Exception as e:
        logger.error(f"Failed to update backend for summary_id {summary_id}: {str(e)}")

def callback(ch, method, properties, body):
    """RabbitMQ message handler."""
    try:
        task = json.loads(body)
        summary_id = task.get("summary_id")
        file_path = task.get("file_path")
        
        logger.info(f"Processing task: summary_id={summary_id}, file={file_path}")
        
        # 1. Extract text
        raw_text = process_pdf(file_path)
        
        if len(raw_text) < 50:
            raise ValueError("Extracted text is too short or empty (possibly scanned image).")
        
        # 2. Get AI summary
        summary_text = get_ai_summary(raw_text)
        
        # 3. Update backend - Success
        update_backend(summary_id, {
            "status": "completed",
            "raw_text": raw_text,
            "summary_text": summary_text
        })
        
    except Exception as e:
        logger.error(f"Task failed: {str(e)}")
        if 'summary_id' in locals():
            update_backend(summary_id, {
                "status": "failed",
                "last_error": str(e)
            })
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)

def main():
    """Main loop for RabbitMQ consumer."""
    logger.info("AI Worker starting...")
    
    # Retry connection to RabbitMQ (useful when starting with docker-compose)
    connection = None
    for i in range(10):
        try:
            params = pika.URLParameters(RABBITMQ_URL)
            connection = pika.BlockingConnection(params)
            break
        except Exception as e:
            logger.warning(f"RabbitMQ not ready, retrying in 5s... ({i+1}/10)")
            time.sleep(5)
    
    if not connection:
        logger.error("Could not connect to RabbitMQ. Exiting.")
        return

    channel = connection.channel()
    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)

    logger.info(f"Worker connected and waiting for messages in '{QUEUE_NAME}'...")
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()
    connection.close()

if __name__ == "__main__":
    main()
