/* global chrome */

chrome.commands.onCommand.addListener(command => {
  const indexStep = {
    'move-tab-left': -1,
    'move-tab-right': 1,
    'move-tab-to-next-window': 1,
  }[command];

  const getNumTabsInCurrentWindow = () => {
    return new Promise((resolve, reject) => {
      chrome.windows.getCurrent({ populate: true }, window => {
        resolve(window.tabs.length);
      });
    });
  };

  const getNumPinnedTabsInCurrentWindow = () => {
    return new Promise((resolve, reject) => {
      chrome.tabs.query(
        {
          currentWindow: true,
          pinned: true,
        },
        tabs => {
          resolve(tabs.length);
        }
      );
    });
  };

  const shiftTabInWindow = tabs => {
    const currentTab = tabs[0];
    if (!currentTab) {
      return;
    }

    getNumTabsInCurrentWindow().then(numTabs => {
      getNumPinnedTabsInCurrentWindow().then(numPinnedTabs => {
        const numUnPinnedTabs = numTabs - numPinnedTabs;
        let newIndex = currentTab.index + indexStep;

        if (currentTab.pinned) {
          newIndex = newIndex % numPinnedTabs;
          if (newIndex === -1) {
            newIndex = numPinnedTabs - 1;
          }
        } else {
          newIndex = ((newIndex - numPinnedTabs) % numUnPinnedTabs) + numPinnedTabs;
          if (newIndex === numPinnedTabs - 1) {
            newIndex = -1;
          }
        }
        chrome.tabs.move(currentTab.id, { index: newIndex });
      });
    });
  };

  const moveTabToWindow = tabs => {
    const currentTab = tabs[0];

    chrome.windows.getAll({ windowTypes: ['normal'] }, windows => {
      const currentWindowIndex = windows.findIndex(window => window.focused);
      let newIndex = (currentWindowIndex + indexStep) % windows.length;

      if (newIndex === -1) {
        newIndex = windows.length - 1;
      }
      const newWindow = windows[newIndex];

      chrome.tabs.move(currentTab.id, { index: -1, windowId: newWindow.id });
      chrome.windows.update(newWindow.id, { focused: true });
      chrome.tabs.update(currentTab.id, {
        active: true,
        pinned: currentTab.pinned,
      });
    });
  };

  const moveTabToNewWindow = tabs => {
    const currentTab = tabs[0];

    chrome.windows.getCurrent({ populate: true }, window => {
      if (window.tabs.length !== 1) {
        chrome.windows.create({ tabId: currentTab.id });
      }
    });
  };

  const moveMultipleTabsToNewWindow = tabs => {
    const numTabs = parseInt(prompt('How many tabs?'));
    if (isNaN(numTabs)) {
      return;
    }

    const currentTabIndex = tabs.findIndex(tab => tab.active);
    const tabsToMove = tabs.slice(Math.max(0, currentTabIndex - numTabs + 1), currentTabIndex);

    chrome.windows.getCurrent({ populate: true }, window => {
      if (window.tabs.length !== 1) {
        chrome.windows.create({ tabId: tabs[currentTabIndex].id }, newWindow => {
          tabsToMove.reverse().forEach(tab => {
            chrome.tabs.move(tab.id, { index: 0, windowId: newWindow.id });
          });
        });
      }
    });
  };

  const executeCommand = commandCallback => {
    [true, false].forEach(pinned => {
      chrome.tabs.query(
        {
          active: true,
          currentWindow: true,
          pinned,
        },
        commandCallback
      );
    });
  };

  if (['move-tab-left', 'move-tab-right'].includes(command)) {
    executeCommand(shiftTabInWindow);
  } else if (command === 'move-tab-to-next-window') {
    executeCommand(moveTabToWindow);
  } else if (command === 'move-tab-to-new-window') {
    executeCommand(moveTabToNewWindow);
  } else if (command === 'move-multiple-tabs-to-new-window') {
    chrome.tabs.query(
      {
        currentWindow: true,
        pinned: false,
      },
      moveMultipleTabsToNewWindow
    );
  } else {
    alert(`Tab rearranger doesn't recognize the command "${command}"`);
  }
});
