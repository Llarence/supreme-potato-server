import fastapi

app = fastapi.FastAPI(docs_url=None, redoc_url=None)

@app.get('/match')
def get_hypo_match(response: fastapi.Response, elim: bool, week: int, detail: int = 0, blues: list[int] = fastapi.Query(None), reds: list[int] = fastapi.Query(None)):
    pass