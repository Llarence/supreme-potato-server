import multitasking

def run_backend():
    import uvicorn
    import os

    os.chdir(os.getcwd() + '/backend')
    uvicorn.run('server:app', port=2521)

def run_frontend():
    import os

    os.chdir(os.getcwd() + '/frontend')
    os.system('npm run build')
    os.system('npm run start')

backend = multitasking.Process(target=run_backend)
frontend = multitasking.Process(target=run_frontend)

backend.start()
frontend.start()

backend.join()
frontend.join()