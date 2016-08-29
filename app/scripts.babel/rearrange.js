chrome.commands.onCommand.addListener(command => {
    let leftRightCommands = ['move-tab-left', 'move-tab-right'];
    let upDownCommands = ['move-tab-to-next-window', 'move-tab-to-previous-window'];
    
    var indexStep = {
        'move-tab-left': -1,
        'move-tab-right': 1,
        'move-tab-to-next-window': 1,
        'move-tab-to-previous-window': -1
    }[command];

    let shiftTabInWindow = tabs => {
        let currentTab = tabs[0];
        // TODO: wrap around.
        chrome.tabs.move(currentTab.id, { index: (currentTab.index + indexStep) });
    };

    let moveTabToWindow = tabs => {
        let currentTab = tabs[0];
        
        chrome.windows.getAll({ windowTypes: ['normal'] }, windows => {
            let currentWindowIndex = windows.map(window => window.focused).indexOf(true);
            let newIndex = (currentWindowIndex + indexStep) % windows.length;
            if (newIndex === -1) {
                newIndex = windows.length - 1;
            }
            let newWindow = windows[newIndex];

            chrome.tabs.move(currentTab.id, { index: -1, windowId: newWindow.id });
            chrome.windows.update(newWindow.id, { focused: true });
            chrome.tabs.update(currentTab.id, { active: true });
        });
    };
    
    let callback = leftRightCommands.indexOf(command) !== -1 ? shiftTabInWindow : moveTabToWindow;

    [true, false].forEach(pinned => {
        chrome.tabs.query({
            active: true,
            currentWindow: true,
            pinned
        }, callback);
    });
});
