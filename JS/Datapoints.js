var bruh = new Audio("click.mp3")

var focused_datapoint = null
var datapoints = []

var current_datatype = ""

var SIDEBAR = {
    title: 0,
    description: 0,
    image: 0
}

async function setup_local() {
    print("Starting local setup")
    SIDEBAR = {}
    let [TITLE, DESCRIPTION, IMAGE] = gid("desktop-sidebar").children
    SIDEBAR.title = TITLE
    SIDEBAR.description = DESCRIPTION
    SIDEBAR.image = IMAGE
    setup_datatype_links() // Verified
    setup_close_buttons() // Verified
    setup_datapoint_numbers()
    set_datapoint_events() // Verified
    set_datapoint_expansion_sizes() // Verified
}

function resize_handler_local() {
    set_datapoint_expansion_sizes()
}

/**
* Returns true if the the datapoints are displayed in classic layout, else false.
*/

function is_classic_layout() {
    return !mobile_mode && document.body.classList.contains("classic-layout");
}

/**
* Adds onclick events to all div.datapoint-choice elements such that when they're clicked, the correct datatype section pops up
* If classic layout is enabled, then the first element of that section is given the 'focused' class
*/

function setup_datatype_links() {
    for(const datatype_choice of gid("datapoint-types-inner").children) {
        datatype_choice.onclick = event=>{
            document.getElementsByClassName("datatype-selected")[0]?.classList.remove("datatype-selected")
            datatype_choice.classList.add("datatype-selected")
            if(current_datatype) gid(current_datatype).classList.remove("shown")
            current_datatype = datatype_choice.getAttribute("target")
            // Update the poster
            gid("desktop-sidebar").lastElementChild.src = `Images/${current_datatype.startsWith("Text")?"text":current_datatype.toLowerCase()}-poster.png`
            // Show the container for the datatype
            gid("datatype-container").classList.add("shown")
            // Show the section with all the datapoints
            gid(current_datatype).classList.add("shown")
            // Hide the datatype-choser section (this too is for mobile only)
            gid("datapoint-types").classList.remove("shown")
            // Update the datapoints array
            datapoints = gid(current_datatype).querySelector(".datapoint-container").children
            
            // If classic layout is enabled, select the first one
            if(is_classic_layout()) {
                focus_datapoint(datapoints[0])
            }
        }
    }
}

/**
* Adds onclick events to the 'X' images in each datatype section's header, such that they'll remove the 'shown' class from the datatype-container
*/

function setup_close_buttons() {
    for(const ele of document.querySelectorAll(".datatype-title > img")) {
        ele.onclick = event=>{
            let datatype_section = ele.parentElement.parentElement
            datatype_section.classList.remove("shown")
            gid("datatype-container").classList.remove("shown")
            gid("datapoint-types").classList.add("shown")
        }
    }
}

/**
 * Assigns a position attribute to every datapoint under every datapoint-container, starting from 1
 */

function setup_datapoint_numbers() {
    [...document.getElementsByClassName("datapoint-container")].forEach(datapoint_container=>{
        [...datapoint_container.children].forEach((datapoint, index)=>[
            datapoint.setAttribute("position", index+1)
        ])
    })
}

/**
* Adds a css variable `--datapoint-text-size` to all datapoint elements which indicates how much the datapoint-content will expand to.
* It's based on the height of the text element inside .datapoint-content
*/

function set_datapoint_expansion_sizes() {
    for(const ele of document.getElementsByClassName("datapoint")) {
        // Set the expansion height based on the content size
        let height = ele.getElementsByTagName("text")[0].offsetHeight
        ele.style = `--datapoint-text-size: ${height}px`
    }
}

/**
* Multipurpose function
* 1. Sets onclick events to datapoint titles such that in list mode when clicked, select_element() is called on that datapoint. Actually, you don't need to check for list mode here, since titles are shown ONLY in list mode anyway.
* 2. Sets onmouseover events to datapoints such that when hovered, focus_element() is called on that datapoint
* 3. Sets onclick events to datapoints such that in classic mode when clicked, select_element() is called on that datapoint
* 
* So to recap, select_element() is called on an element if the header is clicked in list mode, or if the datapoint is clicked in classic mode
*/

function set_datapoint_events() {
    for(const datapoint of document.getElementsByClassName("datapoint")) {
        // 1. Set onclick event for datapoint titles
        let datapoint_title = datapoint.firstElementChild
        datapoint_title.onclick = event=>{
            event.stopPropagation()
            select_datapoint()
        }
        
        // 2. Set onmouseover event for datapoints
        datapoint.onmouseover = event=>{
            focus_datapoint(datapoint)
        }
        
        // 3. Set onclick event for datapoints
        datapoint.onclick = event=>{
            select_datapoint()
        }
    }
}

function focus_datapoint(datapoint) {
    if(focused_datapoint == datapoint) return;
    print("Changing focused_datapoint")
    if(focused_datapoint) {
        focused_datapoint.classList.remove("focused")
    }
    focused_datapoint = datapoint
    datapoint.classList.add("focused")
    // Add details to the sidebar
    SIDEBAR.title.innerHTML = datapoint.firstElementChild.firstElementChild.innerHTML
    SIDEBAR.description.innerHTML = datapoint.getAttribute("description")
}

function deselect_datapoint() {
    print("Deselecting focused_datapoint")
    focused_datapoint.classList.remove("selected")
}

function select_datapoint() {
    let current_selected = document.querySelector(".datapoint.selected")
    if(current_selected == focused_datapoint) {
        print("Removing selection")
        current_selected.classList.remove("selected")
        return
    }
    if(current_selected) {
        current_selected.classList.remove("selected")
    }
    print("Selecting focused_datapoint")
    focused_datapoint.classList.add("selected")
}

/*
Aight
So
When you hover over a datapoint, you give them a selected class and put their value into the info sidebar
But only when you click it does the popup get initialized
it's good because on mobile hover = click so they become yellow + their datapoint content is shown
*/

function prepare_datapoint_expansions() {
    for(const ele of document.getElementsByClassName("datapoint-title")) {
        // Set the onclick event
        let parent = ele.parentElement
        // The following onclick handler is ONLY for list layout, where if you click the header, the content expands
        ele.onclick = event=>{
            if(is_classic_layout()) return;
            if(parent.classList.contains("selected")) {
                parent.classList.remove("selected")
                return
            }
            document.querySelector(".datapoint.selected")?.classList.remove("selected")
            parent.classList.add("selected");
        }
    }
    // The following onmouseover handler is ONLY for classic layout. If a datapoint is hovered over, it gets the class 'selected', 
    for(const ele of document.getElementsByClassName("datapoint")) {
        ele.onmouseover = event=>{
            if(!is_classic_layout() || ele.classList.contains("selected")) return;
            print("MOUSEOVERED")
            document.querySelector(".datapoint.selected").classList.remove("selected")
            ele.classList.add("selected");
            new Audio("click2.mp3").play()
        }
        ele.onclick = event=>{
            if(!is_classic_layout()) return;
            activate_datapoint(ele)
        }
    }
}

// Overrides the main.js setup_key_presses()

function setup_key_presses() {
    document.body.onkeydown = event=>{
        let key = event.key
        if (key == "q") {
            go_to_previous_page()
        }
        else if (key=="e") {
            go_to_next_page()
        }
        else if(key == "Tab") {
            event.preventDefault()
            
            toggle_layout()
        }
        else if(key == "f") {
            select_datapoint()
        }
        else if(is_classic_layout()) {
            // Since this is a classic layout, we need to traverse the grid
            let columns = parseInt(getComputedStyle(gid(current_datatype).getElementsByClassName("datapoint-container")[0]).getPropertyValue("--columns"))
            let new_index = 0;
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
            print(`New Index: ${new_index}`)
            focus_datapoint(datapoints[Math.max(1, Math.min(datapoints.length, new_index))-1])
        }
        // At this point it definitely isn't classic layout, so assume this is all for list layout
        else if(key == "w" || key == "ArrowUp") {
            let new_element = focused_datapoint.previousElementSibling
            if(new_element) {
                focus_datapoint(new_element)
                new_element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
            }
        }
        else if(key == "s" || key == "ArrowDown") {
            let new_element = focused_datapoint.nextElementSibling
            if(new_element) {
                focus_datapoint(new_element)
                new_element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
            }
        }
        else {
            print(key)
        }
    }
}

function toggle_layout() {
    print("Tab pressed")
    
    if (document.body.classList.contains("classic-layout")) {
        // Switch to list layout
        document.body.classList.remove("classic-layout")
    }
    else {
        document.body.classList.add("classic-layout")
    }
    
    // Neccessary because display: none causes the first time to not work
    set_datapoint_expansion_sizes()
}

function toggle_audio_playback(audio_element) {
    print(audio_element)
    audio_element.play()
}