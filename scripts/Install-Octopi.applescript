#!/usr/bin/osascript
-- Octopi Neural Mesh - Complete Installer for macOS
-- Automated installation script with GUI feedback

on run
    display dialog "Welcome to Octopi Neural Mesh Installer!" & return & return & "This will install:" & return & "• Homebrew (if needed)" & return & "• Node.js 18+" & return & "• Git" & return & "• tmux" & return & "• Octopi Neural Mesh" buttons {"Cancel", "Install"} default button "Install" with title "Octopi Installer"
    
    if button returned of result is "Cancel" then
        return
    end if
    
    -- Show progress
    set progress total steps to 7
    set progress completed steps to 0
    set progress description to "Installing Octopi Neural Mesh..."
    
    try
        -- Step 1: Check for Homebrew
        set progress additional description to "Checking Homebrew..."
        try
            do shell script "which brew"
            set progress completed steps to 1
        on error
            set progress additional description to "Installing Homebrew (this may take a while)..."
            try
                do shell script "/bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
                
                -- Add to PATH for M1/M2 Macs
                try
                    do shell script "echo 'eval \"$(/opt/homebrew/bin/brew shellenv)\"' >> ~/.zprofile"
                    do shell script "eval \"$(/opt/homebrew/bin/brew shellenv)\""
                end try
            on error errMsg
                display dialog "Failed to install Homebrew:" & return & errMsg buttons {"OK"} default button 1 with icon stop
                return
            end try
            set progress completed steps to 1
        end try
        
        -- Step 2: Install Node.js
        set progress additional description to "Installing Node.js..."
        try
            set nodeVersion to do shell script "node --version 2>&1 || echo 'not installed'"
            if nodeVersion is "not installed" then
                do shell script "brew install node"
            end if
        on error
            do shell script "brew install node"
        end try
        set progress completed steps to 2
        
        -- Step 3: Install Git
        set progress additional description to "Installing Git..."
        try
            do shell script "git --version"
        on error
            do shell script "brew install git"
        end try
        set progress completed steps to 3
        
        -- Step 4: Install tmux
        set progress additional description to "Installing tmux..."
        try
            do shell script "tmux -V"
        on error
            do shell script "brew install tmux"
        end try
        set progress completed steps to 4
        
        -- Step 5: Clone repository
        set progress additional description to "Cloning Octopi repository..."
        set homeFolder to POSIX path of (path to home folder)
        set repoPath to homeFolder & "octopi-neural-mesh"
        
        try
            do shell script "test -d " & quoted form of repoPath
            -- Repository exists, update it
            do shell script "cd " & quoted form of repoPath & " && git pull"
        on error
            -- Clone new
            do shell script "cd " & quoted form of homeFolder & " && git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/octopi-neural-mesh.git"
        end try
        set progress completed steps to 5
        
        -- Step 6: Install dependencies
        set progress additional description to "Installing Node.js dependencies (this may take a while)..."
        do shell script "cd " & quoted form of repoPath & " && npm install --production"
        set progress completed steps to 6
        
        -- Step 7: Setup environment
        set progress additional description to "Setting up environment..."
        try
            do shell script "test -f " & quoted form of (repoPath & "/.env")
        on error
            do shell script "cd " & quoted form of repoPath & " && cp .env.example .env"
        end try
        
        -- Create logs directory
        do shell script "mkdir -p " & quoted form of (repoPath & "/logs")
        set progress completed steps to 7
        
        -- Installation complete
        set progress additional description to "Installation complete!"
        delay 1
        
        display dialog "✅ Installation Complete!" & return & return & "Next steps:" & return & "1. Edit .env file with your API keys" & return & "2. Run 'Launch Octopi' to start" & return & return & "Would you like to open the configuration file now?" buttons {"Later", "Edit .env", "Launch Now"} default button "Edit .env" with title "Installation Complete"
        
        set userChoice to button returned of result
        
        if userChoice is "Edit .env" then
            do shell script "open -a TextEdit " & quoted form of (repoPath & "/.env")
            display dialog "After editing your .env file with API keys, use the 'Launch Octopi' script to start the system." buttons {"OK"} default button 1
        else if userChoice is "Launch Now" then
            -- Launch Octopi
            tell application "Terminal"
                activate
                do script "cd " & quoted form of repoPath & " && npm start"
            end tell
            delay 3
            open location "http://localhost:3000/octopi"
        end if
        
    on error errMsg number errNum
        display dialog "Installation failed:" & return & return & errMsg & return & "Error: " & errNum buttons {"OK"} default button 1 with icon stop
    end try
    
end run
