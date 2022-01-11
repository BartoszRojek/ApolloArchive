"use strict"

const all_audios = {
    "A": new Array(63).fill(null),
    "H": new Array(22).fill(null)
}
var current_audio = null

var focused_datapoint = null
var selected_datapoint = null
var datapoints = []
var all_texts = null

var current_datatype = ""

var POPUP_MODE = false

var SIDEBAR = {
    title: null,
    description: null,
    image: null
}

var POPUP = {
    element: null,
    header: null,
    dtype: null,
    audio: null,
    text: null
}

function setup_local() {
    print("Starting local setup")
    
    // Set up the SIDEBAR constant
    SIDEBAR = {}
    let [TITLE, DESCRIPTION, IMAGE] = document.getElementById("desktop-sidebar").children
    SIDEBAR.title = TITLE
    SIDEBAR.description = DESCRIPTION
    SIDEBAR.image = IMAGE
    
    // Set up the POPUP constant
    let POPUP_ELEMENT = document.getElementById("datapoint-popup")
    let [header, dtype, audio, text] = document.getElementById("popup-info").children
    POPUP = {
        element: POPUP_ELEMENT,
        header: header,
        dtype: dtype,
        audio: audio,
        text: text
    }
    
    setup_datatype_links()
    setup_close_buttons()
    prepare_datapoints()
    setup_key_presses()
    init_popup()
    document.body.classList.add("classic-layout")
}

function resize_handler_local() {
    let stime = new Date()
    // logtime(stime, "resize_handler_local")
}

/**
* Returns true if the the datapoints are displayed in classic layout, else false.
*/

function is_classic_layout() {
    return !mobile_mode && document.body.classList.contains("classic-layout")
}

/**
* Adds onclick events to all div.datapoint-choice elements such that when they're clicked, the correct datatype section pops up
* NEW: Loads the relevant Texts/[target].json file
* If classic layout is enabled, then the first element of that section is given the 'focused' class
*/

function setup_datatype_links() {
    let stime = new Date()
    for(const datatype_choice of document.getElementById("datapoint-types-inner").children) {
        datatype_choice.onclick = event=>{
            event.stopPropagation()
            let stime = new Date()
            // If you clicked on the currently selected datatype choice, then ignore
            let current_datatype_choice = datatype_choice.parentElement.getElementsByClassName("datatype-selected")[0]
            if(current_datatype && current_datatype_choice == datatype_choice) return
            // If it is another choice, de-select it and hide its corresponding section
            if(current_datatype) {
                current_datatype_choice.classList.remove("datatype-selected")
                document.getElementById(current_datatype).classList.remove("shown")
                pause_audio()
                if(selected_datapoint) {
                    selected_datapoint.classList.remove("selected")
                    selected_datapoint = null
                }
            }
            
            datatype_choice.classList.add("datatype-selected")
            current_datatype = datatype_choice.getAttribute("target")
            fetch(`Texts/${current_datatype}.json`).then(data => data.json()).then(data => all_texts = data)
            // If it's an audio or hologram datapoint, load all the audios
            if(["Audio", "Hologram"].includes(current_datatype)) load_all_audios()
            // Update the poster
            Array.from(document.getElementsByClassName("datatype-poster")).forEach(ele=>{
                ele.src = `Images/${current_datatype.startsWith("Text")?"text":current_datatype.toLowerCase()}-poster.png`
            })
            // Show the container for the datatype
            document.getElementById("datatype-container").classList.add("shown")
            // Show the section with all the datapoints
            document.getElementById(current_datatype).classList.add("shown")
            // Hide the datatype-choser section (this too is for mobile only)
            document.getElementById("datapoint-types").classList.remove("shown")
            // Update the datapoints array
            datapoints = document.getElementById(current_datatype).getElementsByClassName("datapoint-container")[0].children
            
            focus_datapoint(datapoints[0])
            
            // logtime(stime, "link_event")
        }
    }
    // logtime(stime, "setup_datatype_links")
}

/**
* Adds onclick events to the 'X' images in each datatype section's header, such that they'll remove the 'shown' class from the datatype-container
*/

function setup_close_buttons() {
    let stime = new Date()
    for(const ele of document.querySelectorAll(".datatype-title > img")) {
        ele.onclick = event=>{
            let datatype_section = ele.parentElement.parentElement
            datatype_section.classList.remove("shown")
            document.getElementById("datatype-container").classList.remove("shown")
            document.getElementById("datapoint-types").classList.add("shown")
            // Pause the playing audio, if at all
            pause_audio()
            current_datatype = ""
        }
    }
    // logtime(stime, "setup_close_buttons")
}

/**
* Multipurpose function
* 1. Sets onclick events to datapoint titles such that in list mode when clicked, select_element() is called on that datapoint. Actually, you don't need to check for list mode here, since titles are shown ONLY in list mode anyway.
* 2. Sets onmouseover events to datapoints such that when hovered, focus_element() is called on that datapoint
* 3. Sets onclick events to datapoints such that in classic mode when clicked, select_element() is called on that datapoint
* 
* So to recap, select_element() is called on an element if the header is clicked in list mode, or if the datapoint is clicked in classic mode
*/

function prepare_datapoints() {
    let stime = new Date()
    let arr = Array.from(document.getElementsByClassName("datapoint"))
    // Temporary array to store all computed heights of the datapoints, so that reflow occurs only during the initial read (i.e. once)
    let heights = arr.map(ele=>ele.getElementsByTagName("text")[0].offsetHeight)
    arr.forEach((datapoint, index)=>{
        datapoint.setAttribute("position", [...datapoint.parentElement.children].indexOf(datapoint)+1)
        
        datapoint.style.setProperty('--datapoint-text-size', heights[index])
        
        // 2. Set onmouseover event for datapoints
        datapoint.onmouseover = event=>{
            focus_datapoint(datapoint)
        }
        
        // 3. Set onclick event for datapoints
        datapoint.onclick = event=>{
            if(event.target.matches(".play-button")) {
                toggle_audio_playback()
            }
            else if(event.target.matches(".progress-bar")) {
                current_audio.currentTime = current_audio.duration * event.offsetX / event.srcElement.clientWidth
            }
            else if(event.target.matches(".datapoint, .datapoint-title, .datapoint-title > header")) {
                select_datapoint()
            }
        }
    })
    // logtime(stime, "set_datapoint_events")
}

/* AUDIO HANDLERS */

function toggle_audio_playback() {
    if(!current_audio) return
    
    if(current_audio.paused) {
        play_audio()
    }
    else {
        pause_audio()
    }
}

function getTimeStamp(time) {
    let played = parseInt(time)
    let zeros = (n, dig) => Array(`${10**(dig-1)}`.length - `${n?n:0}`.length).fill(0).join("") + "" + n
    return `${parseInt(played / 60)}:${zeros(played % 60, 2)}`
}

function update_progress_bar() {
    if(!selected_datapoint || !current_audio) return
    
    // Update the progress bar
    let perc = 100 * current_audio.currentTime / current_audio.duration
    selected_datapoint.getElementsByClassName("progress-bar")[0].style.setProperty("--perc", perc)
    POPUP.audio.children[1].style.setProperty("--perc", perc)
    // Update the played / length text
    if(current_audio) {
        let current_timestamp = getTimeStamp(current_audio.currentTime)
        let duration_timestamp = getTimeStamp(current_audio.duration)
        // Apply to the default datapoint audio element
        selected_datapoint.querySelector(".ratio").textContent = `${current_timestamp} / ${duration_timestamp}`
        // Apply to the popup datapoint audio element
        POPUP.audio.querySelector(".ratio").textContent = `${current_timestamp} / ${duration_timestamp}`
    }
}

/**
* Returns the audio associated with the selected_datapoint. If the audio has not been loaded yet, it is loaded. If the datapoint isn't a media-type datapoint, returns `null`
*/

function play_audio() {
    current_audio.play()
    if(selected_datapoint) {
        selected_datapoint.classList.add("playing")
    }
    POPUP.audio.classList.add("playing")
}

/**
* Pauses the currently playing datapoint audio. No arguments to be passed as the global `current_audio` refers to it anyway.
*/

function pause_audio() {
    if(current_audio) {
        current_audio.pause()
        if(selected_datapoint) {
            selected_datapoint.classList.remove("playing")
        }
        POPUP.audio.classList.remove("playing")
    }
}

/**
* Stops the currently playing datapoint audio. No arguments to be passed as the global `current_audio` refers to it anyway.
*/

function stop_audio() {
    if(current_audio) {
        pause_audio()
        current_audio.currentTime = 0
    }
}

function load_all_audios() {
    let media_type = current_datatype[0]
    let audios = all_audios[media_type]
    
    if(audios[0] != null) {
        // All audios of this datatype have been loaded
        return
    }
    
    for(let i = 0; i < audios.length; ++i) {
        let audio = document.createElement("AUDIO")
        audio.preload = "metadata"
        audio.onloadedmetadata = event => {            
            let duration_timestamp = getTimeStamp(audio.duration)
            // Get the relevant datapoint
            let datapoint = document.getElementById(current_datatype).querySelector(".datapoint-container").children[i]
            // Set the datapoint audio duration
            datapoint.querySelector(".ratio").textContent = `0:00 / ${duration_timestamp}`
            // Let CSS know that the metadata has been loaded
            datapoint.classList.add("datapoint--loaded-metadata")
        }
        audio.src = `Audio/HZD ${media_type} ${i + 1}.mp3`
        audio.ontimeupdate = update_progress_bar
        audio.onended = stop_audio
        audios[i] = audio
    }
}

/**
* Sets current_audio to the audio associated with the datapoint
* If the datapoint is not a media type, sets current_audio to null
*/

function load_audio() {
    let media_type = selected_datapoint.getAttribute("media-type")
    if(!media_type) {
        current_audio = null
        return null
    }
    
    let datapoint_position = parseInt(selected_datapoint.getAttribute("position"))
    current_audio = all_audios[media_type][datapoint_position-1]
    return current_audio
}

/* POPUP HANDLERS */

/**
* Initializes the popup format
*/

function init_popup() {
    let stime = new Date()
    // Just the popup element
    let play_button = POPUP.element.querySelector(".play-button")
    play_button.onclick = toggle_audio_playback
    play_button.nextElementSibling.onclick = event => {
        current_audio.currentTime = current_audio.duration * event.offsetX / event.srcElement.clientWidth
    }
    // logtime(stime, "setup_datapoint_numbers")
}

/**
* Intialize the popup with the selected datapoint's attributes 
*/

function update_popup() {
    // Set the datapoint title
    POPUP.header.textContent = selected_datapoint.firstElementChild.firstElementChild.innerText
    // Set the datatype
    POPUP.dtype.innerHTML = current_datatype
    
    let media_type = selected_datapoint.getAttribute("media-type")
    
    // Set the popup text
    POPUP.text.querySelector("text").innerHTML = all_texts[parseInt(selected_datapoint.getAttribute("position")) - 1]
    
    if(media_type) {
        // Reset progress bar
        POPUP.audio.children[1].style.setProperty("--perc", 100 * current_audio.currentTime / current_audio.duration)
        
        // Set ratio
        let current_timestamp = getTimeStamp(current_audio.currentTime)
        let duration_timestamp = getTimeStamp(current_audio.duration)
        POPUP.audio.querySelector(".ratio").textContent = `${current_timestamp} / ${duration_timestamp}`
        
        // Set media type attribute
        document.getElementById("popup-content").setAttribute("media-type", media_type)
        document.getElementById("popup-main").setAttribute("media-type", media_type)
    }
    else {
        // Remove media type attribute
        document.getElementById("popup-content").removeAttribute("media-type")
        document.getElementById("popup-main").removeAttribute("media-type")
    }
    
    show_popup()
}

function show_popup() {
    POPUP_MODE = true
    POPUP.element.classList.add("shown")
}

function close_popup() {
    POPUP_MODE = false
    // Pause if playing
    pause_audio()
    POPUP.element.classList.remove("shown")
}

function focus_datapoint(datapoint) {
    if(focused_datapoint == datapoint) return
    // print("Changing focused_datapoint")
    if(focused_datapoint) {
        focused_datapoint.classList.remove("focused")
    }
    focused_datapoint = datapoint
    datapoint.classList.add("focused")
    // Add details to the sidebar
    SIDEBAR.title.innerHTML = datapoint.firstElementChild.firstElementChild.innerHTML
    SIDEBAR.description.innerHTML = datapoint.getAttribute("description")
}

function select_datapoint() {
    if(selected_datapoint == focused_datapoint) {
        // De-select currently focused datapoint
        selected_datapoint.classList.remove("selected")
        // Now that the datapoint has display: none, changes to its children won't cause reflow
        stop_audio()
        close_popup()
        selected_datapoint = null
        return
    }
    // So now, we know it's a new datapoint that's been selected
    if(selected_datapoint) {
        // De-select currently focused datapoint
        selected_datapoint.classList.remove("selected")
        // Now that the datapoint has display: none, changes to its children won't cause reflow
        pause_audio()
    }
    
    // First of all, select the currently focused datapoint
    selected_datapoint = focused_datapoint
    let media_type = selected_datapoint.getAttribute("media-type")
    
    // Set current_audio
    if(!media_type) {
        current_audio = null
    }
    else {
        let datapoint_position = parseInt(selected_datapoint.getAttribute("position"))
        current_audio = all_audios[media_type][datapoint_position-1]
    }
    // If the text hasn't been set, do it now
    if(!selected_datapoint.querySelector("text").textContent) {
        selected_datapoint.querySelector("text").innerHTML = all_texts[parseInt(selected_datapoint.getAttribute("position")) - 1]
    }
    
    update_popup()
    
    // After selecting the datapoint, changes to the datapoint will cause reflow
    selected_datapoint.classList.add("selected")
    selected_datapoint.scrollIntoView()
}

// Overrides the main.js setup_key_presses()

function setup_key_presses() {
    let stime = new Date()
    window.onkeydown = event=>{
        let key = event.key
        
        // If popup is enabled
        if(POPUP_MODE && is_classic_layout()) {
            if(key == "f") {
                toggle_audio_playback(POPUP.audio.firstElementChild)
            }
            else if(key == "Escape") {
                close_popup()
            }
            else {
                print(key)
            }
            return
        }
        // POPUP is definitely not enabled
        if (key == "q") {
            go_to_previous_page()
        }
        else if (key=="e") {
            go_to_next_page()
        }
        else if(key == "CapsLock") {
            event.preventDefault()
            
            toggle_layout()
        }
        else if(key == "f") {
            select_datapoint()
        }
        else if(is_classic_layout()) {
            if(!["w", "a", "s", "d", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"].includes(key)) return
            // Since this is a classic layout, we need to traverse the grid
            let columns = parseInt(getComputedStyle(document.getElementById(current_datatype).querySelector(".datapoint-container")).getPropertyValue("--columns"))
            let new_index = 0
            let position = parseInt(focused_datapoint.getAttribute("position"))
            if(key == "w" || key == "ArrowUp") {
                new_index = position-columns
            }
            else if(key == "s" || key == "ArrowDown") {
                new_index = position+columns
            }
            else if(key == "d" || key == "ArrowRight") {
                new_index = position+1
            }
            else if(key == "a" || key == "ArrowLeft") {
                new_index = position-1
            }
            else {
                return
            }
            focus_datapoint(datapoints[Math.max(1, Math.min(datapoints.length, new_index))-1])
        }
        // At this point it definitely isn't classic layout, so assume this is all for list layout
        else if(key == "w" || key == "ArrowUp") {
            let new_element = focused_datapoint.previousElementSibling
            if(new_element) {
                focus_datapoint(new_element)
                new_element.parentElement.click()
                new_element.scrollIntoView({ block: 'center' })
            }
        }
        else if(key == "s" || key == "ArrowDown") {
            let new_element = focused_datapoint.nextElementSibling
            if(new_element) {
                focus_datapoint(new_element)
                new_element.parentElement.click()
                new_element.scrollIntoView({ block: 'center' })
            }
        }
        else {
            print("koi")
            print(key)
        }
    }
    // logtime(stime, "setup_key_presses")
}

function toggle_layout() {
    if (document.body.classList.contains("classic-layout")) {
        document.body.classList.remove("classic-layout")
    }
    else {
        document.body.classList.add("classic-layout")
    }
}