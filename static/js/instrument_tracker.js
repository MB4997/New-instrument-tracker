
//let session_user;

//--------------------------------------------------------------------------------MY TOOL-KIT SECTION START----------------------------------------------------------
let my_instruments = document.getElementById('my-instruments');

function createCards(myArray, userName) {
  // Clear previous cards
  my_instruments.innerHTML = '';

  // Defensive: handle empty / invalid array
  if (!Array.isArray(myArray) || myArray.length === 0) {
    let message = document.createElement('p');
    message.textContent = "No Data to display";
    message.classList.add('no-data-text');
    my_instruments.appendChild(message);
    return;
  }

  // Track whether we added at least one card for the user
  let addedAny = false;

  myArray.forEach(element => {
    if (element.user_name === userName) {
      addedAny = true;

      let card = document.createElement('div');
      card.id = 'card-' + (element.instrument_id || element.sr_no || Math.random().toString(36).slice(2));
      card.classList.add('instrument-card');
      my_instruments.appendChild(card);

      // Instrument name
      let instrument_name = document.createElement('p');
      instrument_name.style.fontWeight = 'bold';
      instrument_name.textContent = element.instrumentName || 'Unknown Instrument';
      card.appendChild(instrument_name);

      // Make and Serial Number container
      let makeAndSrno = document.createElement('div');
      makeAndSrno.style.display = 'flex';
      makeAndSrno.style.gap = '10px';
      card.appendChild(makeAndSrno);

      // Make
      let make = document.createElement('p');
      make.textContent = 'Make - ' + (element.make || 'N/A');
      makeAndSrno.appendChild(make);

      // Serial Number
      let sr_no = document.createElement('p');
      sr_no.textContent = 'Sr No - ' + (element.sr_no || 'N/A');
      makeAndSrno.appendChild(sr_no);

      // Calibration Certificate link
      if (element.calibration_Certificate) {
        let calibration_Certificate = document.createElement('a');
        calibration_Certificate.setAttribute('href', element.calibration_Certificate);
        calibration_Certificate.textContent = 'Calibration Certificate';
        calibration_Certificate.setAttribute('target', '_blank');
        card.appendChild(calibration_Certificate);
      }

      // Remove button
      let remove_btn = document.createElement('button');
      remove_btn.textContent = 'Remove Instrument';
      remove_btn.classList.add('remove-instrument');
      card.appendChild(remove_btn);

      // Remove functionality
      remove_btn.addEventListener('click', () => {
        let remove_data = {
          'sr_no': (element.sr_no || '').toString(),
          'user_name': 'Available',
          'location': 'NA'
        };
        // Optimistically remove from UI
        card.remove();
        // Send data to Flask using POST
        fetch('/data-for-removing-instrument', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(remove_data)
        })
          .then(response => response.json())
          .then(result => console.log("✅ Server Response:", result))
          .catch(error => console.error("❌ Error:", error));
      });
    }
  });

  // If array present but no instruments for this user
  if (!addedAny) {
    let message = document.createElement('p');
    message.textContent = "No instruments owned by you.";
    message.classList.add('no-data-text');
    my_instruments.appendChild(message);
  }
}


function fetching_instruments_owned_by_me() {
  fetch('/instrument-data-owned-by-me')
    .then(response => response.json())   // parse JSON from Flask
    .then(data => {
      createCards(data, session_user);
    })
    .catch(error => console.error("❌ Error fetching data:", error));
}

fetching_instruments_owned_by_me();


//--------------------------------------------------------------------------------ADD INSTRUMENT SECTION START-------------------------------------------------------- 
// main buttons
const my_tool_kit = document.getElementById('my-tool-kit');
const add_instruments = document.getElementById('add-instrument');
const instrument_status = document.getElementById('Instrument-status');
const Onboard_new_instrument = document.getElementById('Onboard-new-instrument');

// button specific sections (cards)
const my_instrument_section = document.getElementById('my-instruments');
const add_instrument_section = document.getElementById('add-instrument-section');
const instrument_status_section = document.getElementById('instrument-status-section');
const onboard_new_instrument_section = document.getElementById('onboard-new-instrument-section');


let counter_instrument = document.getElementById('counter-add-instu');
let count_instrument = document.getElementById('count-instu');
let timer_count_add_instrument = 0;

//sections
let add_instrument_type_list = document.getElementById('add-instrument-type-list');
let add_instrument_make = document.getElementById('add-instrument-make');
let add_instrument_sr_no = document.getElementById('add-instrument-sr-no');
let add_instrument_location = document.getElementById('add-instrument-location');
let calibration_section = document.getElementById('calibration-section');
let add_instrument_btn = document.getElementById('add-button');

// utility: toggle clicked class among an array of buttons
function setActiveButton(clickedBtn, allButtons) {
  allButtons.forEach(btn => {
    if (!btn) return; // guard if element missing
    if (btn === clickedBtn) {
      btn.classList.remove('btn-prop');
      btn.classList.add('btn-prop-clicked');
    } else {
      btn.classList.remove('btn-prop-clicked');
      btn.classList.add('btn-prop');
    }
  });
}

// utility: show one card, hide the rest (accepts any number)
function showCard(cardToShow, allCards) {
  allCards.forEach(card => {
    if (!card) return; // guard if element missing
    card.style.display = (card === cardToShow) ? 'block' : 'none';
  });
}

function instrument_name_list(array_name) {
  const allNames = array_name.map(item => item.instrumentName);
  // Step 2: Keep only unique names
  const uniqueInstrumentNames = [...new Set(allNames)];
  add_instrument_type_list.innerHTML = ""

  // ✅ Step 3: Add a "Select Instrument Type" placeholder option
  const placeholderOption = document.createElement('option');
  placeholderOption.value = "";              // empty value
  placeholderOption.text = "Select Instrument Type"; // visible text
  placeholderOption.disabled = true;         // prevent selecting it again
  placeholderOption.selected = true;         // show as default selected
  add_instrument_type_list.appendChild(placeholderOption);

  uniqueInstrumentNames.forEach(function (element) {
    let new_option = document.createElement('option');
    new_option.text = element;
    add_instrument_type_list.appendChild(new_option);
  })
  add_instrument_make.innerHTML = '';
  add_instrument_sr_no.innerHTML = '';
  add_instrument_location.value = '';
}

function fetch_instrument_make(array_name) {
  let make_array = [];
  add_instrument_make.value = '';
  add_instrument_sr_no.innerHTML = '';
  calibration_section.innerHTML = '';
  // Add event listener for type selection
  add_instrument_type_list.addEventListener('change', function () {
    // Clear old options before adding new ones
    add_instrument_make.innerHTML = '';
    add_instrument_sr_no.innerHTML = '';
    calibration_section.innerHTML = '';
    make_array = [];

    // Collect serial numbers that match selected instrument
    array_name.forEach(function (element) {
      if (element.instrumentName === add_instrument_type_list.value) {
        make_array.push(element.make);
      }
    });

    // Add placeholder option
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.text = 'Select Instrument Make';
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    add_instrument_make.appendChild(placeholderOption);

    // Populate the dropdown with matching serial numbers

    [...new Set(make_array)].forEach(function (make) {
      const new_option = document.createElement('option');
      new_option.text = make;
      add_instrument_make.appendChild(new_option);
    });
  });
}

function calibration_dates(start_date, end_date) {
  // Create start date <p>
  let calibration_start_date = document.createElement('p');
  calibration_start_date.textContent = `Cal. Start Date - ${start_date}`;
  calibration_section.appendChild(calibration_start_date);

  // Create end date <p>
  let calibration_end_date = document.createElement('p');
  calibration_end_date.textContent = `Cal. End Date -  ${end_date}`;

  // ✅ Check if calibration end date is expired
  const endDate = new Date(end_date);
  const today = new Date();

  if (endDate < today) {
    calibration_end_date.style.color = 'red'; // expired
  } else {
    calibration_end_date.style.color = 'green'; // still valid (optional)
  }

  calibration_section.appendChild(calibration_end_date);
}

function fetching_calibration_data(array_name) {
  add_instrument_sr_no.addEventListener('change', function () {
    calibration_section.innerHTML = '';
    array_name.forEach(function (element) {
      if (element.instrumentName === add_instrument_type_list.value && element.make === add_instrument_make.value && element.sr_no === add_instrument_sr_no.value) {
        calibration_dates(element.cal_start_date, element.cal_end_date);
      }
    })
  })
}



function fetch_instrument_sr_no(array_name) {
  let instrument_sr_no_array = [];
  add_instrument_sr_no.innerHTML = '';
  calibration_section.innerHTML = '';
  add_instrument_make.addEventListener('change', function () {
    add_instrument_sr_no.innerHTML = '';
    instrument_sr_no_array = [];
    calibration_section.innerHTML = '';
    array_name.forEach(function (element) {
      if (element.make === add_instrument_make.value && element.instrumentName === add_instrument_type_list.value) {
        instrument_sr_no_array.push(element.sr_no);
      }
    })
    // Add placeholder option
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.text = 'Select Instrument Sr No';
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    add_instrument_sr_no.appendChild(placeholderOption);

    // Populate the dropdown with matching serial numbers
    instrument_sr_no_array.forEach(function (sr) {
      const new_option = document.createElement('option');
      new_option.text = sr;
      add_instrument_sr_no.appendChild(new_option);
    });
  })
}

function fetching_and_showing_data() {
  fetch('/instrument-data')
    .then(response => response.json())   // parse JSON from Flask
    .then(data => {
      //let all_instrument_data_array = data;
      //console.log(all_instrument_data_array);
      instrument_name_list(data);
      fetch_instrument_make(data);
      fetch_instrument_sr_no(data);
      fetching_calibration_data(data);
    })
    .catch(error => console.error("❌ Error fetching data:", error));
}

add_instrument_btn.addEventListener('click', async function () {
  // Fetch all instruments first
  const res = await fetch('/all-instrument-data');
  const data = await res.json();
  
  // Ensure all required fields filled
  if (!add_instrument_type_list.value || !add_instrument_make.value || !add_instrument_sr_no.value || !add_instrument_location.value) {
    alert('⚠️ Please fill all fields');
    return;
  }

  // 1️⃣ Verify if this instrument already owned
  const foundInstrument = data.find(inst =>
    inst.instrumentName === add_instrument_type_list.value &&
    inst.sr_no === add_instrument_sr_no.value
  );

  if (!foundInstrument) {
    alert("❌ No such instrument found in database");
    return;
  }

  if (foundInstrument.user_name !== "Available") {
    alert(`⚠️ This instrument is already owned by ${foundInstrument.user_name}`);
    return; // 🚫 stop here, don't send POST
  }

  // 2️⃣ If available → proceed to add
  const add_instrument_update_array = {
    sr_no: add_instrument_sr_no.value,
    user_name: session_user,
    location: add_instrument_location.value
  };

  // Optional progress counter UI
  counter_instrument.classList.remove('counter-prop');
  counter_instrument.classList.add('counter-prop-show');
  let interval_instrument = setInterval(function () {
    timer_count_add_instrument += 1;
    count_instrument.textContent = timer_count_add_instrument;
  }, 1000);

  try {
    const response = await fetch('/receive-data-for-add-instrument', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(add_instrument_update_array)
    });
    const result = await response.json();

    if (response.ok) {
      alert("✅ Instrument added successfully!");
      fetching_and_showing_data();
    } else {
      alert(`❌ Server Error: ${result.message || 'Unknown error'}`);
    }

  } catch (error) {
    console.error("❌ Network Error:", error);
    alert("Network error while adding instrument.");
  } finally {
    clearInterval(interval_instrument);
    counter_instrument.classList.remove('counter-prop-show');
    counter_instrument.classList.add('counter-prop');
    count_instrument.textContent = 0;
    timer_count_add_instrument = 0;
  }
});

//--------------------------------------------------------------------------------ADD INSTRUMENT SECTION END--------------------------------------------------------
//--------------------------------------------------------------------------------ONBOARD NEW INSTRUMENT START-----------------------------------------------------------
let onboard_new_instrument_type = document.getElementById('instrument-type');
let onboard_new_instrument_make = document.getElementById('instrument-make');
let onboard_new_instrument_sr_no = document.getElementById('instrument-sr-no');
let onboard_new_instrument_cal_start_date = document.getElementById('calibration-start-date');
let onboard_new_instrument_cal_end_date = document.getElementById('calibration-end-date');
let onboard_new_instrument_cal_link = document.getElementById('calibration-certificates-link');
let onboard_btn = document.getElementById('submit-button');


let counter = document.getElementById('counter');
let count = document.getElementById('count');
let timer_count = 0;


function resetOnboardForm() {
  onboard_new_instrument_type.value = ''; // clears datalist input
  onboard_new_instrument_make.value = '';
  onboard_new_instrument_sr_no.value = '';
  onboard_new_instrument_cal_start_date.value = '';
  onboard_new_instrument_cal_end_date.value = '';
  onboard_new_instrument_cal_link.value = '';
}


onboard_btn.addEventListener('click', async function () {
  // Prevent double clicks
  onboard_btn.disabled = true;

  try {
    // Collect all input values (trimmed)
    const fields = {
      instrumentType: onboard_new_instrument_type.value.trim(),
      make: onboard_new_instrument_make.value.trim(),
      serialNumber: onboard_new_instrument_sr_no.value.trim(),
      calStartDate: onboard_new_instrument_cal_start_date.value.trim(),
      calEndDate: onboard_new_instrument_cal_end_date.value.trim(),
      calLink: onboard_new_instrument_cal_link.value.trim()
    };

    // Validate presence
    const emptyFields = Object.entries(fields)
      .filter(([_, v]) => !v)
      .map(([k]) => k);

    if (emptyFields.length > 0) {
      alert(`Please fill in the following fields:\n\n${emptyFields.join("\n")}`);
      return;
    }

    // Normalize serial number to avoid case mismatches
    const normalizedSr = fields.serialNumber.toUpperCase();

    // Fetch lightweight onboard summary (existing instruments)
    const resp = await fetch('/instrument-data-to-onboard-new-instrument');
    if (!resp.ok) {
      console.error('Failed to fetch existing instruments:', resp.status, resp.statusText);
      alert('Could not verify serial numbers. Try again later.');
      return;
    }

    const data = await resp.json();
    if (!Array.isArray(data)) {
      console.error('Unexpected response for onboard summary:', data);
      alert('Unexpected server response. Check console.');
      return;
    }

    // Get set of existing serial numbers (normalized)
    const existingSet = new Set(data.map(item => (item.sr_no || '').toString().toUpperCase()));

    // If serial already exists — stop early
    if (existingSet.has(normalizedSr)) {
      alert('❌ Serial Number already exists!');
      return;
    }

    // Safely compute max instrument_id (coerce to integer, fallback 0)
    const ids = data
      .map(item => Number(item.instrument_id))
      .filter(n => Number.isFinite(n));
    const maxInstrumentId = ids.length ? Math.max(...ids) : 0;

    // Build payload — follow backend field names
    const new_instrument = {
      instrument_id: maxInstrumentId + 1,
      instrumentName: fields.instrumentType.toUpperCase(),
      make: fields.make.toUpperCase(),
      sr_no: normalizedSr,
      user_name: "Available",
      cal_start_date: fields.calStartDate,
      cal_end_date: fields.calEndDate,
      calibration_Certificate: fields.calLink,
      location: "NA"
    };

    // POST to server and handle response codes
    const postResp = await fetch('/data-for-adding-new-instrument', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(new_instrument)
    });

    if (postResp.status === 201 || postResp.ok) {
      const result = await postResp.json().catch(() => ({}));
      console.log("✅ Server Response:", result);
      alert("✅ New instrument successfully onboarded!");
      resetOnboardForm(); // Clear input fields after success
    } else if (postResp.status === 409) {
      const err = await postResp.json().catch(() => ({}));
      alert(err.message || "Serial number already exists (conflict).");
    } else {
      const err = await postResp.json().catch(() => ({}));
      console.error("Server error:", postResp.status, postResp.statusText, err);
      alert(err.message || "Server error while adding instrument. Check console.");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    alert("Network or unexpected error. Check console for details.");
  } finally {
    onboard_btn.disabled = false;
  }
});

//--------------------------------------------------------------------------------ONBOARD NEW INSTRUMENT END-----------------------------------------------------------
//------------------------------------- INstrument Status Start-------------------------------------------------
let instrument_type_status = document.getElementById('instrument-type-status');
let status_card_section = document.getElementById('status-card-section');

function populate_instrument_types() {
  const instrument_type_status = document.getElementById('instrument-type-status');
  if (!instrument_type_status) {
    console.error("❌ Element with id 'instrument-type-status' not found.");
    return;
  }

  // Clear existing options
  instrument_type_status.innerHTML = '';

  // Add placeholder option
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.text = 'Select Instrument Make';
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  instrument_type_status.appendChild(placeholderOption);

  // Fetch and populate the dropdown
  fetch('/all-instrument-data_for_status')
    .then(response => response.json())
    .then(data => {
      const sorted_data = data.map(element => element.instrumentName);
      const uniqueNames = [...new Set(sorted_data)].sort();

      uniqueNames.forEach(make => {
        const option = document.createElement('option');
        option.value = make;
        option.textContent = make;
        instrument_type_status.appendChild(option);
      });
    })
    .catch(error => console.error("❌ Error fetching data:", error));
}

function create_card_for_instrument_data(element) {

  let instrument_card = document.createElement('div');
  instrument_card.classList.add('instrument-card-status');
  status_card_section.appendChild(instrument_card);
  let instrument_name = document.createElement('p');
  instrument_name.textContent = element.instrumentName;
  instrument_card.append(instrument_name);

  let _make = document.createElement('p');
  _make.textContent = "Make - " + element.make;
  instrument_card.appendChild(_make);

  let _sr = document.createElement('p');
  _sr.textContent = "Sr No - " + element.sr_no;
  instrument_card.appendChild(_sr);

  let owner = document.createElement('p');
  owner.textContent = "Owner - " + element.user_name;
  instrument_card.appendChild(owner);

  let location_ = document.createElement('p');
  location_.textContent = "Location - " + element.location;
  instrument_card.appendChild(location_);

  let calibration = document.createElement('a');
  calibration.href = element.calibration_Certificate;
  calibration.textContent = "Calibration Certificate";
  calibration.target = "_blank"; // optional: open in new tab
  instrument_card.appendChild(calibration);

}


function fetching_instrument_status(instrument_name, data) {
  status_card_section.innerHTML = '';
  data.forEach(element => {
    if (element.instrumentName === instrument_name) {
      create_card_for_instrument_data(element);
    }
  })
}

instrument_type_status.addEventListener('change', function () {
  fetch('/all-instrument-data_for_status')
    .then(response => response.json())
    .then(data => {
      fetching_instrument_status(instrument_type_status.value, data)
    })
    .catch(error => console.error("❌ Error fetching data:", error));
})

document.getElementById('dawnload-sheet').addEventListener('click', async function (e) {
  const btn = e.currentTarget;
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Preparing...';

  try {
    const resp = await fetch('/download-instruments', {
      method: 'GET',
      headers: {
        // you can add auth headers here if needed
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });

    if (!resp.ok) {
      const err = await resp.json().catch(()=>({error: 'unknown'}));
      throw new Error(err.error || `Server error ${resp.status}`);
    }

    const blob = await resp.blob();

    // Create a temporary anchor to trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Try to get filename from content-disposition header if server provides it
    const cd = resp.headers.get('Content-Disposition');
    let filename = 'instruments.xlsx';
    if (cd) {
      const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^;"']+)/i);
      if (match && match[1]) filename = decodeURIComponent(match[1]);
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    alert('Download failed: ' + (error.message || error));
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});


// arrays for convenience
const allButtons = [
  my_tool_kit,
  add_instruments,
  instrument_status,
  Onboard_new_instrument,
];

const allCards = [
  my_instrument_section,
  add_instrument_section,
  instrument_status_section,
  onboard_new_instrument_section,
];

// event listeners
my_tool_kit.addEventListener('click', () => {
  setActiveButton(my_tool_kit, allButtons);
  fetching_instruments_owned_by_me();
  showCard(my_instrument_section, allCards);
  my_instrument_section.style.display = 'grid';

});

add_instruments.addEventListener('click', () => {
  setActiveButton(add_instruments, allButtons);
  showCard(add_instrument_section, allCards);
  fetching_and_showing_data();
});

instrument_status.addEventListener('click', () => {
  setActiveButton(instrument_status, allButtons);
  showCard(instrument_status_section, allCards);
  populate_instrument_types()
  status_card_section.innerHTML = '';
  instrument_status_section.style.display = 'grid';
});

Onboard_new_instrument.addEventListener('click', () => {
  setActiveButton(Onboard_new_instrument, allButtons);
  showCard(onboard_new_instrument_section, allCards);
});



// ------------------ Sign Out Button ------------------
const signOutBtn = document.getElementById("sign-out-btn");

if (signOutBtn) {
  signOutBtn.addEventListener("click", async () => {
    try {
      // Call Flask logout route
      const response = await fetch("/logout", {
        method: "GET",
        credentials: "same-origin" // send session cookie
      });

      // Redirect to login page once logout succeeds
      if (response.ok) {
        window.location.href = "/login";
      } else {
        console.error("Logout failed:", response.status);
        alert("Logout failed. Please try again.");
      }
    } catch (err) {
      console.error("Error during logout:", err);
      alert("Network error. Try again.");
    }
  });
}


