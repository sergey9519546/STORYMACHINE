# Prompt Poet

Prompt Poet is available for future simulated-persona prompt composition in
StoryMachine's local Python environment.

```powershell
.\.venv\Scripts\python.exe -c "from prompt_poet import Prompt; print(Prompt)"
```

To recreate the environment, use Python 3.12, then run:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r tools\prompt-poet\requirements.txt
```
