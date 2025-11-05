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