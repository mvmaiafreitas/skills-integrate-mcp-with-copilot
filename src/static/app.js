document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const signupContainer = document.getElementById("signup-container");
  
  // Authentication elements
  const userIcon = document.getElementById("user-icon");
  const userStatus = document.getElementById("user-status");
  const loginModal = document.getElementById("login-modal");
  const logoutModal = document.getElementById("logout-modal");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const cancelLogin = document.getElementById("cancel-login");
  const cancelLogout = document.getElementById("cancel-logout");
  const loginMessage = document.getElementById("login-message");
  const loggedUsername = document.getElementById("logged-username");
  
  // Store authentication credentials
  let authCredentials = null;
  let currentUser = null;

  // Check authentication status
  async function checkAuth() {
    try {
      const headers = {};
      if (authCredentials) {
        headers['Authorization'] = 'Basic ' + btoa(authCredentials.username + ':' + authCredentials.password);
      }
      
      const response = await fetch('/check-auth', { headers });
      const result = await response.json();
      
      if (result.authenticated) {
        currentUser = result.username;
        userIcon.classList.add('logged-in');
        userStatus.textContent = `${currentUser}`;
        userStatus.classList.remove('hidden');
        signupContainer.classList.remove('hidden');
        return true;
      } else {
        currentUser = null;
        userIcon.classList.remove('logged-in');
        userStatus.classList.add('hidden');
        signupContainer.classList.add('hidden');
        return false;
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      return false;
    }
  }

  // User icon click handler
  userIcon.addEventListener('click', () => {
    if (currentUser) {
      loggedUsername.textContent = currentUser;
      logoutModal.classList.remove('hidden');
    } else {
      loginModal.classList.remove('hidden');
    }
  });

  // Login form submission
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
      const credentials = btoa(username + ':' + password);
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + credentials
        }
      });
      
      if (response.ok) {
        authCredentials = { username, password };
        loginModal.classList.add('hidden');
        loginForm.reset();
        await checkAuth();
        fetchActivities();
      } else {
        loginMessage.textContent = 'Invalid username or password';
        loginMessage.className = 'error';
        loginMessage.classList.remove('hidden');
        setTimeout(() => {
          loginMessage.classList.add('hidden');
        }, 3000);
      }
    } catch (error) {
      console.error('Error logging in:', error);
      loginMessage.textContent = 'Login failed. Please try again.';
      loginMessage.className = 'error';
      loginMessage.classList.remove('hidden');
    }
  });

  // Logout handler
  logoutBtn.addEventListener('click', () => {
    authCredentials = null;
    currentUser = null;
    logoutModal.classList.add('hidden');
    checkAuth();
    fetchActivities();
  });

  // Cancel button handlers
  cancelLogin.addEventListener('click', () => {
    loginModal.classList.add('hidden');
    loginForm.reset();
    loginMessage.classList.add('hidden');
  });

  cancelLogout.addEventListener('click', () => {
    logoutModal.classList.add('hidden');
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons (only visible to teachers)
        const deleteButtonClass = currentUser ? 'delete-btn' : 'delete-btn hidden-for-students';
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="${deleteButtonClass}" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!authCredentials) {
      alert("You must be logged in as a teacher to unregister students.");
      return;
    }

    try {
      const headers = {
        'Authorization': 'Basic ' + btoa(authCredentials.username + ':' + authCredentials.password)
      };
      
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: headers
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authCredentials) {
      alert("You must be logged in as a teacher to register students.");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const headers = {
        'Authorization': 'Basic ' + btoa(authCredentials.username + ':' + authCredentials.password)
      };
      
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: headers
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  checkAuth().then(() => {
    fetchActivities();
  });
});
