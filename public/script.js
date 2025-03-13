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
        emailListContainer.innerHTML = '';
        emailList.classList.add('hidden');
  
        const response = await fetch('/upload', { method: 'POST', body: formData });
        const data = await response.json();
  
        if (!response.ok) throw new Error(data.error || 'Upload failed');
  
        if (data.emails.length > 0) {
          data.emails.forEach(email => {
            const li = document.createElement('li');
            li.textContent = email;
            emailListContainer.appendChild(li);
          });
          emailList.classList.remove('hidden');
          sendButton.disabled = false;
          window.extractedEmails = data.emails;
          uploadStatus.textContent = `Found ${data.emails.length} emails`;
          showNotification(`Extracted ${data.emails.length} emails`, 'success');
        } else {
          uploadStatus.textContent = 'No emails found';
          showNotification('No emails found', 'warning');
        }
      } catch (error) {
        uploadStatus.textContent = `Error: ${error.message}`;
        showNotification(`Error: ${error.message}`, 'error');
      }
    });
  
    // Email sending handler
    sendButton.addEventListener('click', async () => {
      const subject = subjectInput.value.trim();
      const body = bodyInput.value.trim();
      const emails = window.extractedEmails || [];
  
      if (!subject || !body) {
        showNotification('Subject and body are required', 'error');
        return;
      }
      if (emails.length === 0) {
        showNotification('No emails to send', 'error');
        return;
      }
  
      sendButton.disabled = true;
      sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      sendingStatusList.innerHTML = '';
      sendingStatus.classList.remove('hidden');
  
      let successCount = 0;
      let failCount = 0;
  
      for (const email of emails) {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Sending to ${email}...`;
        li.classList.add('pending');
        sendingStatusList.appendChild(li);
  
        try {
          const response = await fetch('/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, body, email })
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
  
      // Summary and troubleshooting
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
  