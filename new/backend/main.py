from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import connect_db, close_db
from routes import auth, vehicles, drivers, trips, maintenance, fuel, analytics

app = FastAPI(
    title="FleetFlow API",
    description="Modular Fleet & Logistics Management System",
    version="1.0.0",
)

ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

# CORS - allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure CORS headers are present even on unhandled 500 errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {"Access-Control-Allow-Origin": origin if origin in ALLOWED_ORIGINS else "http://localhost:3000",
               "Access-Control-Allow-Credentials": "true"}
    return JSONResponse(status_code=500, content={"detail": f"Internal server error: {str(exc)}"}, headers=headers)

@app.on_event("startup")
async def startup():
    await connect_db()

@app.on_event("shutdown")
async def shutdown():
    await close_db()

# Register routers
app.include_router(auth.router)
app.include_router(vehicles.router)
app.include_router(drivers.router)
app.include_router(trips.router)
app.include_router(maintenance.router)
app.include_router(fuel.router)
app.include_router(analytics.router)

@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "app": "FleetFlow API", "version": "1.0.0"}

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
