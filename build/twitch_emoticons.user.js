// ==UserScript==
// @name        Twitch Emoticons
// @namespace   vibend
// @description Enables Twitch emoticons in IRCCloud
// @include     https://www.irccloud.com/*
// @version     2.0.0
// @grant       none
// @updateURL   https://github.com/vibend/irccloud-twitch-emoticons/raw/master/build/twitch_emoticons.meta.js
// @downloadURL https://github.com/vibend/irccloud-twitch-emoticons/raw/master/build/twitch_emoticons.user.js
// ==/UserScript==

//jslint jquery: true

(function () {
'use strict';

var emoteUrl = '//cdn.rawgit.com/vibend/irccloud-twitch-emoticons/master/build/emotes.all.json';
var loadedEmotes = {};
var templateTwitch = '<img src="//static-cdn.jtvnw.net/emoticons/v1/:id/1.0" alt=":name" title=":name">';
var templateBetterttv = '<img src=":src" alt=":name" title=":name">';

// Instead of reading settings every time we process an element, we cache the settings here
var subscriberWhitelist = [];
var imageWidth = null;
var imageHeight = null;
var emoteEnabledGlobal = null;
var emoteEnabledSubscriber = null;
var emoteEnabledBetterttv = null;

var Settings = {
  keyPrefix: 'te.',
  get: function(key, def) {
    var getVal = localStorage.getItem(this.keyPrefix + key);
    if (typeof def !== 'undefined' && getVal == null) {
      this.set(key, def);
      return def;
    }
    return getVal;
  },
  set: function(key, value) {
    localStorage.setItem(this.keyPrefix + key, value);
  }
};

function embedStyle() {
  var style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = '#te-container{font-size:18px}#te-sets label > span::after{content:" emotes)"}#te-sets label > span::before{content:"("}#te-whitelist-box{font-size:12px}#te-donate{font-weight:bold;}#te-donate > *{vertical-align:top}#te-enabled-label{font-weight:normal}#te-enabled-check:not(:checked) ~ #te-enabled-label{color:#f00;}#te-enabled-check:not(:checked) ~ #te-enabled-label::after{content:"Not enabled"}#te-enabled-check:checked ~ #te-enabled-label{color:#008000;}#te-enabled-check:checked ~ #te-enabled-label::after{content:"Enabled"}';
  document.head.appendChild(style);
}
  
function createMenu() {
  return $('<div id="te-bar" class="settingsMenu__item settingsMenu__item__twitchemoticons"><a class="settingsMenu__link" href="#?/settings=twitchemoticons">Twitch Emoticons</a></div>').insertAfter('.settingsContainer .settingsMenu .settingsMenu__item:last');
}
  
function createContainer() {
  return $('<div id="te-container" data-section="twitchemoticons" class="settingsContents settingsContents__twitchemoticons"><h2 id="te-main-header" class="settingsTitle"><span>Twitch Emoticons&nbsp;</span><input id="te-enabled-check" type="checkbox"/>&nbsp;<label id="te-enabled-label" for="te-enabled-check"></label></h2><p class="explanation">Type your text as you normally would, the script will automatically add emoticons to the messages.</p><p class="explanation"><a id="te-reload" href="javascript:void(0)">Click here to load the latest emoticons file</a></p><p class="explanation">After you change a setting, you need to click the <i>Close</i> button and reload the page.</p><h3>What to Watch?</h3><table class="checkboxForm"><tr><td><input id="te-enabled-messages-all" type="radio" name="watch" disabled="disabled"/></td><th><label for="te-enabled-messages-all">Watch all messages (including history)</label></th></tr><tr><td><input id="te-enabled-messages-new" type="radio" name="watch"/></td><th><label for="te-enabled-messages-new">Watch new messages only  </label></th></tr></table><h3>Emoticon Sets</h3><table id="te-sets" class="checkboxForm"><tr><td><input id="te-enabled-global" type="checkbox"/></td><th><label for="te-enabled-global">Global emoticons&nbsp;<span></span></label></th></tr><tr><td><input id="te-enabled-subscriber" type="checkbox"/></td><th><label for="te-enabled-subscriber">Subscriber emoticons&nbsp;<span></span></label><div id="te-whitelist-box"><input id="te-whitelist-input" type="text" placeholder="Channel whitelist"/><br/><span class="explanation">leave empty if you want all subscriber emoticons; seperate channels with a comma</span></div></th></tr><tr><td><input id="te-enabled-betterttv" type="checkbox"/></td><th><label for="te-enabled-betterttv">BetterTTV emoticons&nbsp;<span></span></label></th></tr></table><h3>Emoticon Size</h3><table class="form"><tr><th><label for="te-image-width">Width</label><span class="explanation">&nbsp;(optional)</span></th><td><input id="te-image-width" type="text" class="input"/></td></tr><tr><th><label for="te-image-height">Height</label><span class="explanation">&nbsp;(optional)</span></th><td><input id="te-image-height" type="text" class="input"/></td></tr></table><hr/><p id="te-donate" class="explanation">If you like this script, please&nbsp;<a href="http://dogancelik.com/donate.html" target="_blank">consider a donation</a></p><p class="explanation"><a href="https://github.com/dogancelik/irccloud-twitch-emoticons" target="_blank">Source code</a>&nbsp;-&nbsp;<a href="https://github.com/dogancelik/irccloud-twitch-emoticons/issues" target="_blank">Report bug / Request feature</a></p></div>').insertAfter('.settingsContentsWrapper .settingsContents:last');
}

function loadEmotes(url, callback) {
  var setData = Settings.get('emote.data', '');
  if (setData == '') {
    $.getJSON(url, function (data) {    
      loadedEmotes = data;
      Settings.set('emote.data', JSON.stringify(data));
      callback(data);
    });
  } else {
    var setJson = JSON.parse(setData);
    loadedEmotes = setJson;
    callback(setJson);
  }
}
  
function getWordRegex(key) {
  return new RegExp('\\b' + key + '\\b', 'g');
}

function processImage(elStr, width, height) {
  if (width == null && height == null) return elStr;
  return $(elStr).width(width).height(height).clone().wrap('<div/>').parent().html();
}
  
function processEmote(category, el, width, height) { 
  for (var key in loadedEmotes[category]) {
    // Regex
    var rgx = getWordRegex(key);
    
    // Search text
    if (el.innerHTML.indexOf(key) === -1) continue;
    if (!rgx.test(el.innerHTML)) continue;
    
    // Image tag
    var img = '';
    if (category === 'betterttv') {
      img = templateBetterttv.replace(/:name/g, key).replace(':src', loadedEmotes[category][key]);
    } else {
      img = templateTwitch.replace(/:name/g, key).replace(':id', loadedEmotes[category][key]);
    }
    img = processImage(img, width, height);
    
    // Replace
    el.innerHTML = el.innerHTML.replace(rgx, img);
  }
}
  
function processSubEmote(category, el, width, height) {
  for (var chan in loadedEmotes[category]) {    
    if ((subscriberWhitelist.length > 0 && subscriberWhitelist.indexOf(chan) !== -1) || (subscriberWhitelist.length == 0)) {
      for (var emote in loadedEmotes[category][chan]) {
        
        // Stupid fix for duplicate Kappa
        if (emote === 'Kappa') continue;
        
        // Regex
        var rgx = getWordRegex(emote);

        // Search
        if (el.innerHTML.indexOf(emote) === -1) continue;
        if (!rgx.test(el.innerHTML)) continue;
        
        // Image
        var img = '';
        img = templateTwitch.replace(/:name/g, emote).replace(':id', loadedEmotes[category][chan][emote]);
        img = processImage(img, width, height);
        
        // Replace
        el.innerHTML = el.innerHTML.replace(rgx, img);
      } 
    } else {
      continue;
    }
  }
}
  
function countSubEmote(category) {
  var t = 0;
  for (var key in loadedEmotes[category]) {
    t += Object.keys(loadedEmotes[category][key]).length;
  }
  return t;
}
  
function processMessage(el) {
  if (emoteEnabledGlobal) processEmote('global', el, imageWidth, imageHeight);
  if (emoteEnabledSubscriber) processSubEmote('subscriber', el, imageWidth, imageHeight);
  if (emoteEnabledBetterttv) processEmote('betterttv', el, imageWidth, imageHeight);
}
  
function bindMessages() {
  window.SESSION.backend.bind('message', function (msg) {
    if (msg.type === 'buffer_msg') {
      var elId = 'e' + msg.bid + '_' + msg.eid;
      setTimeout(function() {
        var el = document.getElementById(elId);
        if (el == null) return;
        var elc = el.querySelector('.message .content');
        processMessage(elc);
      }, 100);
    }
  });
}

function init() {
  embedStyle();

  var menu = createMenu();

  if (window.location.hash === '#?/settings=twitchemoticons') {
    window.location.hash = '#?/settings';
    menu.find('a')[0].click();
  }

  var container = createContainer();
  
  container.find('#te-enabled-check').on('change', function() {
    Settings.set('enabled', this.checked);
  }).prop('checked', JSON.parse(Settings.get('enabled', true)));
  
  container.find('#te-reload').on('click', function() {
    Settings.set('emote.data', '');
    this.innerHTML = '(Will download the latest emoticons file after you reload the page)';
  });
  
  var radiosWatch = container.find("input:radio[name='watch']");
  radiosWatch.on('change', function() {
    Settings.set('watch.mode', radiosWatch.index(this));
  });
  radiosWatch.eq(Settings.get('watch.mode', 1)).prop('checked', true);

  container.find('#te-enabled-global').on('change', function() {
    Settings.set('emote.global.enabled', this.checked);
  }).prop('checked', JSON.parse(Settings.get('emote.global.enabled', true)));
  
  container.find('#te-enabled-subscriber').on('change', function() {
      Settings.set('emote.subscriber.enabled', this.checked);
  }).prop('checked', JSON.parse(Settings.get('emote.subscriber.enabled', false)));
  
  container.find('#te-enabled-betterttv').on('change', function() {
      Settings.set('emote.betterttv.enabled', this.checked);
  }).prop('checked', JSON.parse(Settings.get('emote.betterttv.enabled', true)));
  
  container.find('#te-whitelist-input').on('change', function() {
    Settings.set('emote.subscriber.whitelist', this.value);
  }).val(Settings.get('emote.subscriber.whitelist', ''));
  
  container.find('#te-image-width').on('change', function() {
    Settings.set('image.width', this.value);
  }).val(Settings.get('image.width', ''));
  
  container.find('#te-image-height').on('change', function() {
    Settings.set('image.height', this.value);
  }).val(Settings.get('image.height', ''));
  
  loadEmotes(emoteUrl, function() {
    var spans = container.find('#te-sets label > span');
    spans.eq(0).append($("<code>").text(Object.keys(loadedEmotes.global).length));
    spans.eq(1).append($("<code>").text(countSubEmote('subscriber')));
    spans.eq(2).append($("<code>").text(Object.keys(loadedEmotes.betterttv).length));
    
    // Chrome can't into .map(String.trim)
    subscriberWhitelist = Settings.get('emote.subscriber.whitelist').trim().toLowerCase().split(',').map(function(i) { return i.trim(); }).filter(function(i){ return i !== ""; });
    imageWidth = Settings.get('image.width') || null;
    imageHeight = Settings.get('image.height') || null;
    emoteEnabledGlobal = JSON.parse(Settings.get('emote.global.enabled'));
    emoteEnabledSubscriber = JSON.parse(Settings.get('emote.subscriber.enabled'));
    emoteEnabledBetterttv = JSON.parse(Settings.get('emote.betterttv.enabled'));
    
    if (JSON.parse(Settings.get('enabled'))) {
      bindMessages();
    }
  });
}
  
(function checkSession () {
  if (window.hasOwnProperty('SESSION')) {
    window.SESSION.bind('init', function () {
      init();
    });
  } else {
    setTimeout(checkSession, 100);
  }
})();

})();
