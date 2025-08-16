import os
from dotenv import load_dotenv

load_dotenv() 

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "mysql+pymysql://iwas:devpassword@127.0.0.1:3306/iwas")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_COOKIE_SECURE = False           # True in prod behind HTTPS
    JWT_COOKIE_SAMESITE = "Lax"
    JWT_COOKIE_CSRF_PROTECT = True
    JWT_ACCESS_TOKEN_EXPIRES = 900      # 15 min
    JWT_REFRESH_TOKEN_EXPIRES = 2592000 # 30 days

    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173")
