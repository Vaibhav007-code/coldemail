document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file');
    const subjectInput = document.getElementById('subject');
    const bodyInput = document.getElementById('body');
    const sendButton = document.getElementById('send');
    const uploadStatus = document.getElementById('upload-status');
    const emailList = document.getElementById('email-list');
    const emailListContainer = emailList.querySelector('ul');
    const sendingStatus = document.getElementById('sending-status');
    const sendingStatusList = sendingStatus.querySelector('ul');
    const notification = document.getElementById('notification');
    
    // New elements for sender details
    const senderNameInput = document.getElementById('sender-name');
    const senderEmailInput = document.getElementById('sender-email');
    
    // Manual email addition elements
    const manualEmailInput = document.getElementById('manual-email');
    const addEmailButton = document.getElementById('add-email');
  
    // Show notification
    function showNotification(message, type = 'success') {
      notification.textContent = message;
      notification.className = `notification ${type}`;
      notification.style.display = 'block';
      setTimeout(() => (notification.style.display = 'none'), 5000);
    }
  
    // File upload handler
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
  
      if (file.type !== 'application/pdf') {
        showNotification('Please upload a PDF file', 'error');
        return;
      }
  
      uploadStatus.textContent = 'Processing file...';
      uploadStatus.style.display = 'block';
  
      const formData = new FormData();
      formData.append('file', file);
  
      try {
        // Clear the email list display
        emailListContainer.innerHTML = '';
        emailList.classList.add('hidden');
  
        const response = await fetch('/upload', { method: 'POST', body: formData });
        const data = await response.json();
  
        if (!response.ok) throw new Error(data.error || 'Upload failed');
  
        // Merge extracted emails with any manually added emails
        window.extractedEmails = [...(window.extractedEmails || []), ...data.emails];
  
        if (window.extractedEmails.length > 0) {
          // Remove duplicates
          window.extractedEmails = Array.from(new Set(window.extractedEmails));
          window.extractedEmails.forEach(email => {
            const li = document.createElement('li');
            li.textContent = email;
            emailListContainer.appendChild(li);
          });
          emailList.classList.remove('hidden');
          sendButton.disabled = false;
          uploadStatus.textContent = `Found ${data.emails.length} emails from PDF`;
          showNotification(`Extracted ${data.emails.length} emails from PDF`, 'success');
        } else {
          uploadStatus.textContent = 'No emails found';
          showNotification('No emails found', 'warning');
        }
      } catch (error) {
        uploadStatus.textContent = `Error: ${error.message}`;
        showNotification(`Error: ${error.message}`, 'error');
      }
    });
  
    // Manual email addition handler
    addEmailButton.addEventListener('click', () => {
      const email = manualEmailInput.value.trim();
      if (!email) {
        showNotification('Please enter an email address', 'error');
        return;
      }
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showNotification('Invalid email address', 'error');
        return;
      }
      // Initialize or merge with existing emails
      window.extractedEmails = window.extractedEmails || [];
      if (window.extractedEmails.includes(email)) {
        showNotification('Email already added', 'warning');
        manualEmailInput.value = '';
        return;
      }
      window.extractedEmails.push(email);
      if (emailList.classList.contains('hidden')) {
        emailList.classList.remove('hidden');
      }
      const li = document.createElement('li');
      li.textContent = email;
      emailListContainer.appendChild(li);
      showNotification('Email added successfully', 'success');
      manualEmailInput.value = '';
      sendButton.disabled = false;
    });
  
    // Email sending handler
    sendButton.addEventListener('click', async () => {
      const subject = subjectInput.value.trim();
      const body = bodyInput.value.trim();
      const recipientEmails = window.extractedEmails || [];
      const senderName = senderNameInput.value.trim();
      const senderEmail = senderEmailInput.value.trim() || '';
  
      if (!subject || !body) {
        showNotification('Subject and body are required', 'error');
        return;
      }
      if (recipientEmails.length === 0) {
        showNotification('No recipient emails to send', 'error');
        return;
      }
      if (!senderName) {
        showNotification('Please enter your name', 'error');
        return;
      }
      // Optional: Validate senderEmail if provided; otherwise, it will default on the server side.
      if (senderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
        showNotification('Invalid sender email address', 'error');
        return;
      }
  
      sendButton.disabled = true;
      sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      sendingStatusList.innerHTML = '';
      sendingStatus.classList.remove('hidden');
  
      let successCount = 0;
      let failCount = 0;
  
      for (const email of recipientEmails) {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Sending to ${email}...`;
        li.classList.add('pending');
        sendingStatusList.appendChild(li);
  
        try {
          const response = await fetch('/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject,
              body,
              email,
              senderName,
              senderEmail,
            }),
          });
          const data = await response.json();
  
          if (response.ok && data.success) {
            li.innerHTML = `<i class="fas fa-check-circle"></i> Sent to ${email}`;
            li.classList.remove('pending');
            li.classList.add('success');
            successCount++;
          } else {
            throw new Error(data.error || 'Sending failed');
          }
        } catch (error) {
          li.innerHTML = `<i class="fas fa-times-circle"></i> Failed: ${email} - ${error.message}`;
          li.classList.remove('pending');
          li.classList.add('error');
          failCount++;
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay between sends
      }
  
      sendButton.disabled = false;
      sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send Emails';
  
      if (failCount > 0) {
        const tips = document.createElement('div');
        tips.className = 'troubleshoot-tips';
        tips.innerHTML = `
          <h4>Troubleshooting Tips:</h4>
          <ul>
            <li>Enable "Less Secure Apps" in Gmail if 2FA is off.</li>
            <li>Use an App Password if 2FA is on.</li>
            <li>Check Gmail's daily sending limit.</li>
            <li>Verify recipient email addresses.</li>
            <li>Ensure a stable internet connection.</li>
          </ul>
        `;
        sendingStatus.appendChild(tips);
      }
  
      showNotification(
        `Sent: ${successCount}, Failed: ${failCount}`,
        failCount === 0 ? 'success' : 'warning'
      );
    });
  });
  