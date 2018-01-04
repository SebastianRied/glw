@echo off
cd /d %~dp0
echo installs node packages
CMD /C npm --version
pause
@echo on
CMD /C npm install

@echo off
echo installation of node packages done.
pause
echo starting build.
CMD /C grunt build
echo build done.
echo install couchDB if you havn't done yet
echo use the glw.bat to run the webserver
pause