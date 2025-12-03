#!/usr/bin/osascript
-- Octopi Neural Mesh - Status Check Script for macOS
-- Checks if Octopi is running and displays status information

on run
    try
        -- Try to get health status
        set statusJSON to do shell script "curl -s --connect-timeout 2 http://localhost:3000/octopi/health"
        
        -- Parse basic info (simple extraction)
        set statusInfo to "✅ Octopi is Running" & return & return
        set statusInfo to statusInfo & "Health Check Response:" & return
        set statusInfo to statusInfo & statusJSON
        
        -- Show status dialog
        display dialog statusInfo buttons {"Open Web Interface", "View Logs", "OK"} default button "OK" with title "Octopi Neural Mesh Status" with icon note
        
        set buttonChoice to button returned of result
        
        if buttonChoice is "Open Web Interface" then
            open location "http://localhost:3000/octopi"
        else if buttonChoice is "View Logs" then
            set repoPath to (POSIX path of (path to home folder)) & "octopi-neural-mesh"
            tell application "Terminal"
                activate
                do script "cd " & quoted form of repoPath & " && tail -f logs/octopi.log"
            end tell
        end if
        
    on error errMsg
        -- Octopi is not running
        set statusInfo to "❌ Octopi is Not Running" & return & return
        set statusInfo to statusInfo & "Would you like to start it?"
        
        display dialog statusInfo buttons {"No", "Yes"} default button "Yes" with title "Octopi Neural Mesh Status" with icon caution
        
        if button returned of result is "Yes" then
            set repoPath to (POSIX path of (path to home folder)) & "octopi-neural-mesh"
            
            -- Check if repo exists
            try
                do shell script "test -d " & quoted form of repoPath
                
                -- Launch Octopi
                tell application "Terminal"
                    activate
                    do script "cd " & quoted form of repoPath & " && npm start"
                end tell
                
                delay 3
                open location "http://localhost:3000/octopi"
                
                display notification "Octopi started successfully" with title "Octopi Neural Mesh"
            on error
                display dialog "Octopi repository not found at:" & return & repoPath & return & return & "Please run the installer first." buttons {"OK"} default button 1 with icon stop
            end try
        end if
    end try
end run
