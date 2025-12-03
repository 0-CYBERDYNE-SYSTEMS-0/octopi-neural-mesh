#!/usr/bin/osascript
-- Octopi Neural Mesh - Quick Launch Script for macOS
-- Launches Octopi in Terminal with tmux session management

on run
    set repoPath to (POSIX path of (path to home folder)) & "octopi-neural-mesh"
    
    -- Check if repository exists
    try
        do shell script "test -d " & quoted form of repoPath
    on error
        display dialog "Octopi repository not found at:" & return & repoPath & return & return & "Please run the installer first." buttons {"OK"} default button 1 with icon stop
        return
    end try
    
    tell application "Terminal"
        activate
        
        -- Check if tmux session exists
        try
            set sessionExists to do shell script "tmux has-session -t octopi 2>/dev/null && echo 'yes' || echo 'no'"
            
            if sessionExists is "yes" then
                -- Attach to existing session
                display notification "Attaching to existing Octopi session" with title "Octopi Neural Mesh"
                do script "tmux attach -t octopi"
            else
                -- Create new session
                display notification "Starting new Octopi session" with title "Octopi Neural Mesh"
                do script "cd " & quoted form of repoPath & " && tmux new-session -s octopi 'npm start'"
            end if
        on error errMsg
            -- Fallback: start without tmux
            display notification "Starting Octopi (tmux not available)" with title "Octopi Neural Mesh"
            do script "cd " & quoted form of repoPath & " && npm start"
        end try
    end tell
    
    -- Wait for server to start
    delay 3
    
    -- Open web interface in default browser
    try
        open location "http://localhost:3000/octopi"
    end try
    
    return "Octopi Neural Mesh launched successfully!"
end run
