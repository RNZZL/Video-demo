let lastVideoTime = 0;
let lastVideoSnippetStartTime = 0;
let videoObj;
let currentUrl;
let videoDuration;//by ZZL


function highlightHandler() {
    //Get selected text.
    let content = extractSelectedText();
    //If no content has been selected, ignore.
    if (content === "")
        return;
    let bhvItm = makeBehaviorItem("select", content);
    chrome.runtime.sendMessage(bhvItm, (response) => {
        console.log("Message Response: ", response); //Response is undefined.
    });
}

function clipboardHandler(e) {
    //Check for text selection.
    let content = extractSelectedText();
    if (content === "")
        return;
    //Store the behavior duplicate in the content of the text selected.
    let behaviorItem = makeBehaviorItem("copy", content);
    /*
        The superceding section concerns the detection of a html code element.
     */
    // A cursor that tracks the hierarchy of elements to see if a <code> tag is present.
    let cur = e.target;
    while (cur.tagName.toLowerCase() !== "code" && (cur = cur.parentNode) !== document.body) ;
    //If the highest element tracked by the cursor can be ascribed to <code>.
    if (cur.tagName.toLowerCase() === "code") {
        //Add code indication to datatype.
        behaviorItem["datatype"] = "code";
    }
    //TODO: add case for image url
    //Send message to the background with modification requirements. The time recorded
    //of the copy event would be that of the highlighted.
    chrome.runtime.sendMessage(behaviorItem, (response) => {
        console.log("Message Response: ", response); //Response is undefined.
    });
}

/**
 * Extract selected text. Returns "" if no text selected.
 * @returns {string}
 */
function extractSelectedText() {
    //Text selected.
    let sel = window.getSelection();
    if (sel) {
        //Highlighted content;
        //If no text has been selected, and mouseup was simply trigger by itself.
        console.log(sel);//testZZL
        return sel.toString();
    }
}

/**
 * This function makes a customary representation of a user's browsing behavior.
 * It is a map with the keys "type", the type of browsing event, "data", the content
 * correlated with the event, "time", time of this event, "title", the title of the
 * page, and "url", the hyperlink to that site.
 * @param event_type event type
 * @param content The content associated with this event.
 * @returns {{data: *, time: Date, type: *, title: string, url: string}}
 */
function makeBehaviorItem(event_type, content) {
    return {
        "eventtype": event_type,
        "time": new Date(),
        "url": currentUrl,
        "title": document.title,
        "data": content,
    };
}


function drawMarker(time_pair) {//by ZZL
    console.log("draw");
    let $blueBar = $(blueProgressBar);
    let ratio = time_pair[1] / time_pair[2] - time_pair[0] / time_pair[2],//by ZZL
        propValue = `scaleX(${ratio})`;
    $blueBar.css('left', ((time_pair[0] / time_pair[2]) * 100) + '%');
    $blueBar.css('transform', propValue);
    $('div.ytp-play-progress.ytp-swatch-background-color:not(.blueProgress)').after($blueBar);//by ZZL
}

function removeMarkers() {
    console.log("remove markers...");
    $('div.ytp-play-progress.ytp-swatch-background-color').remove('.blueProgress');
}

function loadMarkers() {
    removeMarkers();//by ZZL
    console.log("load markers...");
    let behaviorItem;
    behaviorItem = makeBehaviorItem("video_play");
    chrome.runtime.sendMessage(behaviorItem, (response) => {
        for (let i = 0; i <= response.length - 1; i++) {
            console.log("Message Response: ", response[i]);
            drawMarker(response[i].split(":"));
        }
    });
}

function saveQuery() {
    let query;
    let url=document.location.href;
    if (url.includes("google.com")) {
        const regex = /(?<=q=).*?(?=&)/s;
        if (url.match(regex) !== null) {
            query = url.match(regex)[0].replace(/\+/g, ' ');
            let behaviorItem = makeBehaviorItem("search", query);
            chrome.runtime.sendMessage(behaviorItem, (response) => {
                console.log("Message Response: ", response); //Response is undefined.
            });
        }
    }
}


$(document).arrive('video', {existing: true}, function (v) {
    videoObj = v;
    console.log(videoObj);// test
    videoObj.ontimeupdate = function () {
        // if there is a big gap between the current play time and the last play time,
        // the user has skipped/rewind the video
        if (!isPlayingYoutubeAd()) {
            if (!isNaN(videoObj.duration)) {
                videoDuration = videoObj.duration;
            }//by ZZL
            if (Math.abs(videoObj.currentTime - lastVideoTime) > 5) {
                console.log("snippet:" + lastVideoSnippetStartTime + " ---  " + lastVideoTime, "duration:" + videoDuration);
                behaviorItem = makeBehaviorItem("video", lastVideoSnippetStartTime + ":" + lastVideoTime + ":" + videoDuration);//by ZZL
                if (lastVideoTime - lastVideoSnippetStartTime > 3) {
                    chrome.runtime.sendMessage(behaviorItem, (response) => {
                        console.log("Message Response: ", response); //Response is undefined.
                    });
                }//by ZZL
                lastVideoSnippetStartTime = videoObj.currentTime;//by ZZL
                //TODO: handle rewind event.//
            }
            lastVideoTime = videoObj.currentTime;
        }
    };

    videoObj.onpause = function () {
        console.log("paused");
    };

    videoObj.onended = function () {
        console.log("ended");
    };

    window.onbeforeunload = function () {
        console.log("closed");
        behaviorItem = makeBehaviorItem("video", lastVideoSnippetStartTime + ":" + lastVideoTime + ":" + videoDuration);//by ZZL
        if (lastVideoTime - lastVideoSnippetStartTime > 3) {
            chrome.runtime.sendMessage(behaviorItem, (response) => {
                console.log("Message Response: ", response); //Response is undefined.
            });
        }
    }
});


function isPlayingYoutubeAd() {
    return $(".ytp-play-progress").css("background-color") === "rgb(255, 204, 0)";
}

// Listening url changes for the current tab.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    setTimeout(function () {
        currentUrl = message.url;
        console.log("currentUrl: " + currentUrl);
        if (currentUrl === document.location.href) {
            loadMarkers();
        }//by ZZL
    }, 3000);
    saveQuery();
    //TODO: collect url history here.

});


document.addEventListener('copy', clipboardHandler);
document.addEventListener('mouseup', highlightHandler);