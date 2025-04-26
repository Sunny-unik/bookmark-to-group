document.addEventListener("DOMContentLoaded", function () {
  // Get DOM elements
  const folderList = document.getElementById("folderList");

  // Helper: Open a group of URLs as a tab group with a given name
  function openUrlsAsGroup(urls, groupName) {
    if (urls.length === 0) return;
    chrome.tabs.create({ url: urls[0] }, function (firstTab) {
      chrome.tabs.group({ tabIds: firstTab.id }, function (groupId) {
        chrome.tabGroups.update(groupId, { title: groupName });
        for (let i = 1; i < urls.length; i++) {
          chrome.tabs.create({ url: urls[i] }, function (newTab) {
            chrome.tabs.group({ tabIds: newTab.id, groupId: groupId });
          });
        }
      });
    });
  }

  // Open all direct bookmarks as one group, and each immediate subfolder's bookmarks as their own group
  function openFolder(folderId, folderTitle) {
    chrome.bookmarks.getChildren(folderId, function (children) {
      // Separate direct bookmarks and subfolders
      const directBookmarks = children
        .filter((child) => child.url)
        .map((child) => child.url);
      const subfolders = children.filter((child) => child.children);

      // Open direct bookmarks as a group (if any)
      if (directBookmarks.length > 0) {
        openUrlsAsGroup(directBookmarks, folderTitle);
      }

      // For each subfolder, open its bookmarks as a group
      subfolders.forEach((subfolder) => {
        chrome.bookmarks.getChildren(subfolder.id, function (subChildren) {
          const subUrls = subChildren
            .filter((child) => child.url)
            .map((child) => child.url);
          if (subUrls.length > 0) {
            openUrlsAsGroup(subUrls, subfolder.title);
          }
        });
      });
    });
  }

  // Function to get the full path of a bookmark folder
  function getFolderPath(node, path = []) {
    if (!node.parentId) {
      return path.reverse().join(" / ");
    }
    return chrome.bookmarks.get(node.parentId).then((parents) => {
      const parent = parents[0];
      path.push(parent.title);
      return getFolderPath(parent, path);
    });
  }

  // Function to populate bookmark folders
  function populateBookmarkFolders() {
    chrome.bookmarks.getTree(function (bookmarkTreeNodes) {
      function processNode(node) {
        if (node.children) {
          if (
            node.parentId &&
            node.children.some((child) => child.url || child.children)
          ) {
            const folderItem = document.createElement("div");
            folderItem.className = "folder-item";

            const folderName = document.createElement("span");
            // Get the full path for this folder
            getFolderPath(node, [node.title]).then((fullPath) => {
              folderName.textContent = fullPath;
            });

            const openButton = document.createElement("button");
            openButton.textContent = "Open Group";
            openButton.addEventListener("click", () =>
              openFolder(node.id, node.title)
            );

            folderItem.appendChild(folderName);
            folderItem.appendChild(openButton);
            folderList.appendChild(folderItem);
          }

          node.children.forEach(processNode);
        }
      }

      bookmarkTreeNodes.forEach(processNode);
    });
  }

  // Initialize the popup
  populateBookmarkFolders();
});
