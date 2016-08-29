chrome.commands.onCommand.addListener(command => {
    let leftRightCommands = ['move-tab-left', 'move-tab-right'];
    let upDownCommands = ['move-tab-to-next-window'];
    
    var indexStep = {
        'move-tab-left': -1,
        'move-tab-right': 1,
        'move-tab-to-next-window': 1
    }[command];

    let getNumTabsInCurrentWindow = callback => {
        chrome.windows.getCurrent({ populate: true }, window => {
            callback(window.tabs.length);
        });
    };

    let getNumPinnedTabsInCurrentWindow = callback => {
        chrome.tabs.query({
            currentWindow: true,
            pinned: true
        }, tabs => {
            callback(tabs.length);
        });
    };

    let shiftTabInWindow = tabs => {
        let currentTab = tabs[0];

        getNumTabsInCurrentWindow(numTabs => {
            getNumPinnedTabsInCurrentWindow(numPinnedTabs => {
                let numUnPinnedTabs = numTabs - numPinnedTabs;
                var newIndex = currentTab.index + indexStep;
                if (currentTab.pinned) {
                    newIndex = newIndex % numPinnedTabs;
                    if (newIndex === -1) {
                        newIndex = numPinnedTabs - 1;
                    }
                } else {
                    newIndex = (newIndex - numPinnedTabs) % numUnPinnedTabs + numPinnedTabs;
                    if (newIndex === numPinnedTabs - 1) {
                        newIndex = -1;
                    }
                }
                chrome.tabs.move(currentTab.id, { index: newIndex });
            });
        });
    };

    let moveTabToWindow = tabs => {
        let currentTab = tabs[0];
        let tabPinned = currentTab.pinned;
        chrome.windows.getAll({ windowTypes: ['normal'] }, windows => {
            let currentWindowIndex = windows.map(window => window.focused).indexOf(true);
            let newIndex = (currentWindowIndex + indexStep) % windows.length;
            if (newIndex === -1) {
                newIndex = windows.length - 1;
            }
            let newWindow = windows[newIndex];

            chrome.tabs.move(currentTab.id, { index: -1, windowId: newWindow.id });
            chrome.windows.update(newWindow.id, { focused: true });
            chrome.tabs.update(currentTab.id, { active: true, pinned: tabPinned });
        });
    };

    let moveTabToNewWindow = tabs => {
        let currentTab = tabs[0];

        chrome.windows.getCurrent({ populate: true }, window => {
            if (window.tabs.length !== 1) {
                chrome.windows.create({ tabId: currentTab.id });
            }
        });
    };

    let callback = undefined;
    if (leftRightCommands.indexOf(command) !== -1) {
        callback = shiftTabInWindow;
    } else if (upDownCommands.indexOf(command) !== -1) {
        callback = moveTabToWindow;
    } else {
        callback = moveTabToNewWindow;
    }

    [true, false].forEach(pinned => {
        chrome.tabs.query({
            active: true,
            currentWindow: true,
            pinned
        }, callback);
    });
});
