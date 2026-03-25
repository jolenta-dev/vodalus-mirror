var lastDisplayed = { name: "", artist: "" };
/* When nothing is "now playing", Last.fm still returns the last scrobble; use its time to go idle after 15 min. */
var IDLE_AFTER_SCROBBLE_MS = 15 * 60 * 1000;

var getSetLastFM = function() {
  fetch("/api/lastfm")
    .then(function(resp) {
      if (!resp.ok) throw new Error("lastfm proxy not ok");
      return resp.json();
    })
    .then(function(resp) {
      var tracks = resp.recenttracks.track;
      if (!tracks) return;
      if (!Array.isArray(tracks)) tracks = [tracks];
      if (!tracks.length) return;
      var recentTrack = tracks.find(function(t) { return t["@attr"] && t["@attr"].nowplaying === "true"; }) || tracks[0];
      var isNowPlaying = recentTrack["@attr"] && recentTrack["@attr"].nowplaying === "true";
      var name;
      var artist;
      if (isNowPlaying) {
        name = recentTrack.name;
        artist = (recentTrack.artist && recentTrack.artist["#text"]) || "";
      } else {
        var utsRaw = recentTrack.date && recentTrack.date.uts;
        var utsMs = utsRaw != null ? parseInt(String(utsRaw), 10) * 1000 : NaN;
        var scrobbleStale = !isNaN(utsMs) && Date.now() - utsMs > IDLE_AFTER_SCROBBLE_MS;
        if (scrobbleStale) {
          name = "alone with my thoughts";
          artist = "";
        } else {
          name = recentTrack.name;
          artist = (recentTrack.artist && recentTrack.artist["#text"]) || "";
        }
      }
      if (name === lastDisplayed.name && artist === lastDisplayed.artist) return;
      lastDisplayed.name = name;
      lastDisplayed.artist = artist;

      var trackTitle = document.querySelector("#tracktitle");
      var trackArtist = document.querySelector("#trackartist");
      var trackArt = document.querySelector("#trackart");

      if (trackTitle) {
        trackTitle.textContent = name;
        trackTitle.setAttribute("title", artist ? name + " by " + artist : name);
      }
      if (trackArtist) {
        trackArtist.textContent = artist;
        trackArtist.setAttribute("title", artist ? "Artist : " + artist : "");
      }
      if (trackArt) {
        if (name === "alone with my thoughts") {
          trackArt.style.display = "none";
        } else if (recentTrack.image && recentTrack.image[2]) {
          trackArt.src = recentTrack.image[2]["#text"];
          trackArt.alt = (recentTrack.album && recentTrack.album["#text"]) || name;
          trackArt.style.display = "block";
        } else {
          trackArt.style.display = "none";
        }
      }
    })
    .catch(function() {
      if (lastDisplayed.name === "" && lastDisplayed.artist === "") return;
      lastDisplayed.name = "";
      lastDisplayed.artist = "";
      var trackTitle = document.querySelector("#tracktitle");
      var trackArtist = document.querySelector("#trackartist");
      var trackArt = document.querySelector("#trackart");
      if (trackTitle) {
        trackTitle.textContent = "404 Not Found";
        trackTitle.setAttribute("title", "404 Not Found");
      }
      if (trackArtist) {
        trackArtist.textContent = "";
        trackArtist.setAttribute("title", "");
      }
      if (trackArt) trackArt.style.display = "none";
    });
};

getSetLastFM();
setInterval(getSetLastFM, 15000);
