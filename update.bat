@echo off
cd /d %~dp0
echo start glw update
pause
git fetch origin master
git reset --hard FETCH_HEAD
git clean -df
grunt build

echo update finished
pause