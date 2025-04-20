document.addEventListener('DOMContentLoaded', () => {
  console.log('insurance-form.js loaded');
  const urlParams = new URLSearchParams(window.location.search);
  const hamlet = urlParams.get('hamlet');
  const submissionIndex = urlParams.get('submission');
  const draftIndex = urlParams.get('draft');
  const mode = urlParams.get('mode') || 'edit';
  const form = document.getElementById('insuranceForm');
  const submitBtn = document.getElementById('submitBtn');
  const draftBtn = document.getElementById('draftBtn');
  const backBtn = document.getElementById('backBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const claimRefInput = document.getElementById('claim_ref_number');

  console.log('URL params:', { hamlet, submissionIndex, draftIndex, mode });

  // Set up back button immediately
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      console.log('Back button clicked');
      window.location.href = `/insurance-submissions.html?hamlet=${encodeURIComponent(hamlet)}`;
    });
  } else {
    console.error('Back button not found');
  }

  // Set up logout button immediately
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      console.log('Logout button clicked');
      localStorage.clear();
      window.location.href = '/index.html';
    });
  } else {
    console.error('Logout button not found');
  }

  // Set up draft button immediately
  if (draftBtn) {
    draftBtn.addEventListener('click', function() {
      console.log('Draft button clicked');
      if (!form) {
        console.error('Form not found');
        return;
      }
      const formData = new FormData();
      const draft = {};
      for (const [key, value] of new FormData(form)) {
        if (key !== 'claim_application_photo' && key !== 'claiming_for_image') {
          draft[key] = value;
        }
      }

      // Ensure claim reference number is set
      if (!draft.claim_ref_number) {
        draft.claim_ref_number = generateClaimRefNumber(hamlet);
      }

      formData.append('draft', JSON.stringify(draft));
      
      // Add claim application photo
      const claimApplicationPhoto = form.querySelector('[name="claim_application_photo"]').files[0];
      if (claimApplicationPhoto) {
        formData.append('claim_application_photo', claimApplicationPhoto);
      }
      
      // Add claiming for image if it exists
      const claimingForImage = form.querySelector('[name="claiming_for_image"]');
      if (claimingForImage && claimingForImage.files[0]) {
        formData.append('claiming_for_image', claimingForImage.files[0]);
      }

      console.log('Saving draft data:', {
        draft: draft,
        hasClaimApplicationPhoto: !!claimApplicationPhoto,
        hasClaimingForImage: !!(claimingForImage && claimingForImage.files[0])
      });

      fetch(`/api/insurance/${encodeURIComponent(hamlet)}/draft`, {
        method: 'POST',
        body: formData
      })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          return response.json();
        })
        .then(data => {
          if (data.success) {
            window.location.href = `/insurance-submissions.html?hamlet=${encodeURIComponent(hamlet)}`;
          } else {
            alert('Draft save failed: ' + (data.error || 'Unknown error'));
          }
        })
        .catch(error => {
          console.error('Error saving draft:', error);
          alert('Error saving draft: ' + error.message);
        });
    });
  } else {
    console.error('Draft button not found');
  }

  // Set up form submission immediately
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('Form submitted');
      const formData = new FormData();
      const submission = {};
      for (const [key, value] of new FormData(this)) {
        if (key !== 'claim_application_photo' && key !== 'claiming_for_image') {
          submission[key] = value;
        }
      }

      // Ensure claim reference number is set
      if (!submission.claim_ref_number) {
        submission.claim_ref_number = generateClaimRefNumber(hamlet);
      }

      formData.append('submission', JSON.stringify(submission));
      
      // Add claim application photo
      const claimApplicationPhoto = form.querySelector('[name="claim_application_photo"]').files[0];
      if (claimApplicationPhoto) {
        formData.append('claim_application_photo', claimApplicationPhoto);
      }
      
      // Add claiming for image if it exists
      const claimingForImage = form.querySelector('[name="claiming_for_image"]');
      if (claimingForImage && claimingForImage.files[0]) {
        formData.append('claiming_for_image', claimingForImage.files[0]);
      }

      console.log('Submitting form data:', {
        submission: submission,
        hasClaimApplicationPhoto: !!claimApplicationPhoto,
        hasClaimingForImage: !!(claimingForImage && claimingForImage.files[0])
      });

      fetch(`/api/insurance/${encodeURIComponent(hamlet)}/submit`, {
        method: 'POST',
        body: formData
      })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          return response.json();
        })
        .then(data => {
          if (data.success) {
            window.location.href = `/insurance-submissions.html?hamlet=${encodeURIComponent(hamlet)}`;
          } else {
            alert('Submission failed: ' + (data.error || 'Unknown error'));
          }
        })
        .catch(error => {
          console.error('Error submitting form:', error);
          alert('Error submitting form: ' + error.message);
        });
    });
  } else {
    console.error('Form not found');
  }

  if (!hamlet) {
    console.error('No hamlet specified');
    alert('No hamlet specified!');
    window.location.href = '/dashboard.html';
    return;
  }

  document.getElementById('hamlet').textContent = hamlet;

  // Set current date as default for claim_date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('claim_date').value = today;

  // Function to create image upload field
  function createImageUploadField(containerId, fieldName, label) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear any existing content
    container.innerHTML = '';

    // Create the image upload field
    const imageUploadDiv = document.createElement('div');
    imageUploadDiv.className = 'form-group';
    imageUploadDiv.innerHTML = `
      <label>Upload Image for ${label}: <input type="file" name="${fieldName}" id="${fieldName}" accept="image/*" required></label>
      <div id="${fieldName}_preview" class="photo-preview"></div>
    `;

    // Add event listener for image preview
    const fileInput = imageUploadDiv.querySelector('input[type="file"]');
    fileInput.addEventListener('change', function(e) {
      const previewDiv = document.getElementById(`${fieldName}_preview`);
      previewDiv.innerHTML = '';
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.maxWidth = '200px';
          img.style.margin = '5px';
          previewDiv.appendChild(img);
        };
        reader.readAsDataURL(this.files[0]);
      }
    });

    container.appendChild(imageUploadDiv);
  }

  // Add event listener to the "Claiming for" dropdown
  const claimingForSelect = document.getElementById('claiming_for');
  if (claimingForSelect) {
    claimingForSelect.addEventListener('change', function() {
      const selectedOption = this.options[this.selectedIndex].text;
      const fieldName = 'claiming_for_image';
      
      if (this.value) {
        // If an option is selected, show the image upload field
        createImageUploadField('claiming_for_image_container', fieldName, selectedOption);
      } else {
        // If no option is selected, clear the container
        const container = document.getElementById('claiming_for_image_container');
        if (container) {
          container.innerHTML = '';
        }
      }
    });
  }

  // Generate claim reference number
  const generateClaimRefNumber = (hamlet) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const serial = '001'; // We'll update this based on existing claims
    return `CLM-${hamlet}-${year}${month}${day}-${serial}`;
  };

  function populateForm(data) {
    console.log('Populating form with data:', data);
    Object.keys(data).forEach(key => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        if (input.type === 'file') {
          // Handle file inputs separately
          if (data[key]) {
            const previewDiv = document.getElementById(`${key}_preview`);
            if (previewDiv) {
              if (Array.isArray(data[key])) {
                previewDiv.innerHTML = data[key].map(photo => `
                  <img src="${photo}" alt="Claim photo" style="max-width: 200px; margin: 5px;">
                `).join('');
              } else {
                previewDiv.innerHTML = `<img src="${data[key]}" alt="Claim photo" style="max-width: 200px; margin: 5px;">`;
              }
            }
          }
        } else {
          input.value = data[key];
        }
      }
    });
  }

  function disableForm() {
    Array.from(form.elements).forEach(element => {
      element.disabled = true;
    });
    submitBtn.style.display = 'none';
    draftBtn.style.display = 'none';
  }

  // Fetch VEC data and populate form
  fetch(`/api/vec/${encodeURIComponent(hamlet)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(vecData => {
      console.log('VEC data:', vecData);
      // Populate form with VEC data
      document.getElementById('state').value = vecData.state || '';
      document.getElementById('district').value = vecData.district || '';
      document.getElementById('block').value = vecData.block || '';
      document.getElementById('gp').value = vecData.gp || '';
      document.getElementById('village').value = vecData.village || '';
      document.getElementById('hamlet_input').value = vecData.hamlet || '';
      document.getElementById('vec_name').value = vecData.vec_name || '';
      document.getElementById('microgrid_id').value = vecData.microgrid_id || '';

      // Generate claim reference number for new forms
      if (!submissionIndex && !draftIndex) {
        // Set a default claim reference number immediately
        const defaultRefNumber = generateClaimRefNumber(hamlet);
        if (claimRefInput) {
          claimRefInput.value = defaultRefNumber;
          console.log('Set default claim reference number:', defaultRefNumber);
        } else {
          console.error('Claim reference input element not found');
        }
        
        // Then try to fetch insurance data to get the correct serial number
        return fetch(`/api/insurance/${encodeURIComponent(hamlet)}`)
          .then(response => {
            if (!response.ok) {
              // If we get a 404, that's okay - we'll use the default ref number
              console.log('No existing insurance data found, using default ref number');
              return { submissions: [], drafts: [] };
            }
            return response.json();
          })
          .then(insuranceData => {
            const submissions = insuranceData.submissions || [];
            const drafts = insuranceData.drafts || [];
            const date = new Date();
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            
            // Filter claims from current day
            const todayClaims = [...submissions, ...drafts].filter(claim => {
              if (!claim.claim_ref_number) return false;
              const [, , claimDate] = claim.claim_ref_number.split('-');
              return claimDate === `${year}${month}${day}`;
            });

            // Calculate next serial number
            const nextSerial = (todayClaims.length + 1).toString().padStart(3, '0');
            const updatedRefNumber = `CLM-${hamlet}-${year}${month}${day}-${nextSerial}`;
            if (claimRefInput) {
              claimRefInput.value = updatedRefNumber;
              console.log('Updated claim reference number:', updatedRefNumber);
            } else {
              console.error('Claim reference input element not found');
            }

            // Return the insurance data for further processing
            return insuranceData;
          })
          .catch(error => {
            console.error('Error fetching insurance data:', error);
            // Continue with the default ref number
            return { submissions: [], drafts: [] };
          });
      }
      
      // If we're not generating a new claim reference number, fetch insurance data
      return fetch(`/api/insurance/${encodeURIComponent(hamlet)}`).then(response => {
        if (!response.ok) {
          // If we get a 404, return empty data
          if (response.status === 404) {
            console.log('No existing insurance data found');
            return { submissions: [], drafts: [] };
          }
          throw new Error(`Failed to fetch insurance data: ${response.status}`);
        }
        return response.json();
      });
    })
    .then(insuranceData => {
      if (!insuranceData) return; // Skip if no insurance data (happens when generating claim ref number)
      
      console.log('Insurance data:', insuranceData);
      const submissions = insuranceData.submissions || [];
      const drafts = insuranceData.drafts || [];

      if (submissionIndex !== null) {
        // View/edit submission
        const submission = submissions[submissionIndex];
        if (submission) {
          populateForm(submission);
          if (mode === 'readonly') {
            disableForm();
          }
        }
      } else if (draftIndex !== null) {
        // View/edit draft
        const draft = drafts[draftIndex];
        if (draft) {
          populateForm(draft);
          if (mode === 'readonly') {
            disableForm();
          }
        }
      }
    })
    .catch(error => {
      console.error('Error fetching data:', error);
      // Don't show error alert for 404s since we handle them gracefully
      if (!error.message.includes('404')) {
        alert('Error loading data: ' + error.message);
      }
    });

  // Handle claim application photo input change
  document.getElementById('claim_application_photo').addEventListener('change', function(e) {
    const previewDiv = document.getElementById('claim_application_photo_preview');
    previewDiv.innerHTML = '';
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.maxWidth = '200px';
        img.style.margin = '5px';
        previewDiv.appendChild(img);
      };
      reader.readAsDataURL(this.files[0]);
    }
  });

  // Handle claim photos input change
  document.getElementById('claim_photos').addEventListener('change', function(e) {
    const previewDiv = document.getElementById('claim_photos_preview');
    previewDiv.innerHTML = '';
    Array.from(this.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.maxWidth = '200px';
        img.style.margin = '5px';
        previewDiv.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

  // Add claim application image field at the end
  const formContainer = form.querySelector('.form-container');
  if (formContainer) {
    const claimApplicationDiv = document.createElement('div');
    claimApplicationDiv.className = 'form-group';
    claimApplicationDiv.innerHTML = `
      <label for="claim_application_photo">Upload Claim Application Image</label>
      <input type="file" name="claim_application_photo" id="claim_application_photo" accept="image/*" class="form-control">
      <div id="claim_application_photo_preview" class="image-preview"></div>
    `;

    // Add event listener for image preview
    const fileInput = claimApplicationDiv.querySelector('input[type="file"]');
    fileInput.addEventListener('change', function(e) {
      const previewDiv = document.getElementById('claim_application_photo_preview');
      previewDiv.innerHTML = '';
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.maxWidth = '200px';
          img.style.margin = '5px';
          previewDiv.appendChild(img);
        };
        reader.readAsDataURL(this.files[0]);
      }
    });

    formContainer.appendChild(claimApplicationDiv);
  }
}); 