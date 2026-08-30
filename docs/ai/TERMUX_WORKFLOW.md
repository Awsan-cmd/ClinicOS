# Termux / Git Handoff
The user uses Termux + Git. For every implementation task the AI must:
1. inspect repository;
2. identify exact files;
3. provide complete contents for each changed file;
4. provide copy/paste-ready Termux commands;
5. provide Git commands;
6. state expected verification;
7. after user pushes, inspect GitHub when available;
8. verify structure/content before continuing.

Typical:
```bash
git clone https://github.com/Awsan-cmd/ClinicOS.git
cd ClinicOS
git checkout -b feature/<name>
# execute provided file commands
git status
git diff
# run provided tests
git add .
git commit -m "<provided message>"
git push -u origin feature/<name>
```
Never claim a push or remote verification without evidence.
