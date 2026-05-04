import logging
import os
import re
import fitz  # PyMuPDF
import google.generativeai as genai
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# Tải cấu hình từ file .env (nếu có)
load_dotenv()

# Gemini client is initialised lazily when the AI path is first used.
_gemini_model = None

def _get_gemini_model():
    global _gemini_model
    if _gemini_model is None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is not set")
        genai.configure(api_key=api_key)
        _gemini_model = genai.GenerativeModel("gemini-1.5-flash")
    return _gemini_model

app = FastAPI(title="UniHub Workshop PDF Summarizer")

def clean_text(text: str) -> str:
    """
    Hàm làm sạch văn bản: xóa ký tự đặc biệt, khoảng trắng thừa và sửa lỗi xuống dòng.
    """
    # Xóa các ký tự không phải chữ cái/số hoặc dấu câu cơ bản
    text = re.sub(r'[^\w\s\d\.\,\!\?\(\)\-\:\/]', '', text)
    # Thay thế nhiều dấu cách/xuống dòng bằng một khoảng trắng duy nhất
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

@app.post("/api/summarize")
async def summarize_pdf(file: UploadFile = File(...)):
    # 1. Validate: Kiểm tra định dạng file
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ định dạng file PDF.")

    try:
        # 2. Trích xuất: Đọc trực tiếp từ memory stream
        file_content = await file.read()
        
        # Mở PDF bằng PyMuPDF từ dữ liệu byte
        doc = fitz.open(stream=file_content, filetype="pdf")
        full_text = ""
        for page in doc:
            full_text += page.get_text()
        doc.close()

        # 3. Làm sạch dữ liệu
        cleaned_data = clean_text(full_text)

        # Kiểm tra độ dài văn bản (nghi ngờ PDF dạng ảnh hoặc rỗng)
        if len(cleaned_data) < 50:
            raise HTTPException(
                status_code=400, 
                detail="Nội dung PDF quá ngắn hoặc không thể trích xuất text (có thể là file ảnh)."
            )

        # 4. Gọi AI (Prompting) - Tạm thời comment đoạn này lại theo yêu cầu
        # prompt = f"""
        # Bạn là một trợ lý AI chuyên nghiệp cho dự án UniHub Workshop.
        # Hãy tóm tắt nội dung văn bản dưới đây một cách chuyên nghiệp và súc tích.
        # Yêu cầu bản tóm tắt phải bao gồm các ý chính sau:
        # - Mục tiêu của workshop.
        # - Đối tượng tham gia.
        # - Các nội dung chính sẽ diễn ra.

        # Văn bản gốc:
        # {cleaned_data}
        # """

        # Gọi Google Gemini API
        # response = _get_gemini_model().generate_content(prompt)
        # summary = response.text

        # 5. Trả kết quả (Trả về raw text đã parse)
        return JSONResponse(
            status_code=200,
            content={
                "filename": file.filename,
                "raw_text": cleaned_data  # Trả về text đã trích xuất và làm sạch
            }
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error processing PDF: %s", file.filename)
        raise HTTPException(
            status_code=500,
            detail="Đã xảy ra lỗi trong quá trình xử lý file."
        )

if __name__ == "__main__":
    import uvicorn
    # Chạy server với uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
