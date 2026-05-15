const loginInput = document.getElementById('login-password-input');
const loginReveal = document.getElementById('login-reveal');
loginInput.type = 'password';
if (loginReveal) {
  loginReveal.checked = false;
  loginReveal.addEventListener('change', () => {
    loginInput.type = loginReveal.checked ? 'text' : 'password';
  });
}
document.getElementById('login-password-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('login-button').click();
});

document.getElementById('login-button').addEventListener('click', async () => {
  const name = document.getElementById('login-name-input').value.trim();
  const password = document.getElementById('login-password-input').value;

  if (!name || !password) {
    alert('Please enter both name and password');
    return;
  }

  try {
    const response = await fetch('/api/adminLogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        alert(`${data.error}. Do not meddle in that which you do not understand.` || 'Login failed');
      } catch {
        alert('Server error: ' + response.status);
      }
      return;
    }

    const data = await response.json();
    localStorage.setItem('admin-name', name);
    localStorage.setItem('admin-password', password);
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('admin-dashboard-container').style.display = 'block';
    loadSqlTables();
    loadConversations();
  } catch (err) {
    alert('Cannot reach server - is it running?');
  }
});

function loadSqlTables() {
  fetch('/api/admin/sqlDbTables').then(r => r.json()).then(data => {
    const sqlDbTables = data.tables;
    const container = document.getElementById('sql-table-radios');
    const list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.padding = '0';

    sqlDbTables.forEach((table, index) => {
      const listItem = document.createElement('li');
      listItem.style.marginBottom = '8px';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'sql-db-radio';
      radio.value = table.name;
      radio.id = `sql-db-radio-${table.name}`;
      if (index === 0) radio.checked = true;

      const label = document.createElement('label');
      label.htmlFor = `sql-db-radio-${table.name}`;
      label.textContent = table.name;
      label.style.cursor = 'pointer';
      label.style.marginLeft = '5px';

      listItem.appendChild(radio);
      listItem.appendChild(label);
      list.appendChild(listItem);

      radio.addEventListener('change', updateSqlBuilder);
    });

    container.appendChild(list);
    updateSqlBuilder();
  }).catch(err => {
    alert(err.message || 'Network/SQL error. Try refreshing.');
  });
}

let conversationsData = [];
function loadConversations() {
  fetch('/api/conversations', { credentials: 'include' }).then(r => r.json()).then(data => {
    conversationsData = data.conversations || [];
    const announcementChatSelect = document.getElementById('new-announcement-chat-input');
    const membersChatSelect = document.getElementById('chat-admin-members-select');

    announcementChatSelect.innerHTML = '<option value="">Select a chat...</option>';
    membersChatSelect.innerHTML = '<option value="">Select a chat...</option>';

    conversationsData.forEach(conv => {
      const label = conv.label || conv.id;
      const opt1 = document.createElement('option');
      opt1.value = conv.id;
      opt1.textContent = label;
      announcementChatSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = conv.id;
      opt2.textContent = label;
      membersChatSelect.appendChild(opt2);
    });
  }).catch(err => {
    console.error('Failed to load conversations:', err);
  });
}

document.getElementById('new-announcement-scope-input').addEventListener('change', (e) => {
  const chatSelect = document.getElementById('new-announcement-chat-input');
  if (e.target.value === 'here') {
    chatSelect.style.display = 'inline-block';
  } else {
    chatSelect.style.display = 'none';
  }
});

document.getElementById('chat-admin-tab-new').addEventListener('click', () => {
  document.getElementById('chat-admin-tab-new').classList.add('chat-admin-tab--active');
  document.getElementById('chat-admin-tab-members').classList.remove('chat-admin-tab--active');
  document.getElementById('chat-admin-panel-new').style.display = 'block';
  document.getElementById('chat-admin-panel-members').style.display = 'none';
});

document.getElementById('chat-admin-tab-members').addEventListener('click', () => {
  document.getElementById('chat-admin-tab-members').classList.add('chat-admin-tab--active');
  document.getElementById('chat-admin-tab-new').classList.remove('chat-admin-tab--active');
  document.getElementById('chat-admin-panel-members').style.display = 'block';
  document.getElementById('chat-admin-panel-new').style.display = 'none';
});

document.getElementById('chat-admin-members-select').addEventListener('change', (e) => {
  const convId = e.target.value;
  if (!convId) {
    document.getElementById('chat-admin-members-context').textContent = '';
    document.getElementById('chat-admin-members-list').innerHTML = '';
    return;
  }

  const conv = conversationsData.find(c => c.id === convId);
  const label = conv ? (conv.label || conv.id) : convId;
  document.getElementById('chat-admin-members-context').textContent = `Managing members for: ${label}`;

  fetch(`/api/conversations/${encodeURIComponent(convId)}/members`, { credentials: 'include' }).then(r => r.json()).then(data => {
    const membersList = document.getElementById('chat-admin-members-list');
    membersList.innerHTML = '';
    if (data.members && data.members.length > 0) {
      data.members.forEach(member => {
        const memberDiv = document.createElement('div');
        memberDiv.textContent = member.name;
        memberDiv.style.padding = '4px 0';
        membersList.appendChild(memberDiv);
      });
    } else {
      membersList.innerHTML = '<p style="color: #666;">No members found</p>';
    }
  }).catch(err => {
    alert('Failed to load members: ' + err.message);
  });
});

document.getElementById('new-chat-modal-ok').addEventListener('click', () => {
  const name = document.getElementById('new-chat-modal-input').value.trim();
  const members = document.getElementById('new-chat-members-input').value.trim();
  const isPublic = document.getElementById('new-chat-modal-public').checked;

  fetch('/api/createConversation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      members,
      public: isPublic,
      adminName: localStorage.getItem('admin-name'),
      password: localStorage.getItem('admin-password')
    })
  }).then(async r => {
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to create chat');
    }
    return r.json();
  }).then(data => {
    alert(data.message || 'Chat created successfully');
    document.getElementById('new-chat-modal-input').value = '';
    document.getElementById('new-chat-members-input').value = '';
    document.getElementById('new-chat-modal-public').checked = false;
    loadConversations();
  }).catch(err => {
    alert(err.message);
  });
});

document.getElementById('chat-edit-members-ok').addEventListener('click', () => {
  const convId = document.getElementById('chat-admin-members-select').value;
  if (!convId) return alert('Please select a chat first');

  const members = document.getElementById('chat-edit-members-input').value.trim();
  if (!members) return alert('Please enter members to add');

  fetch('/api/conversation/addMembers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: convId,
      members,
      name: localStorage.getItem('admin-name'),
      password: localStorage.getItem('admin-password')
    })
  }).then(async r => {
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to add members');
    }
    return r.json();
  }).then(data => {
    alert(data.message || 'Members added successfully');
    document.getElementById('chat-edit-members-input').value = '';
    document.getElementById('chat-admin-members-select').dispatchEvent(new Event('change'));
  }).catch(err => {
    alert(err.message);
  });
});

document.getElementById('chat-remove-members-ok').addEventListener('click', () => {
  const convId = document.getElementById('chat-admin-members-select').value;
  if (!convId) return alert('Please select a chat first');

  const members = document.getElementById('chat-remove-members-input').value.trim();
  if (!members) return alert('Please enter members to remove');

  fetch('/api/conversation/removeMembers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: convId,
      members,
      name: localStorage.getItem('admin-name'),
      password: localStorage.getItem('admin-password')
    })
  }).then(async r => {
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to remove members');
    }
    return r.json();
  }).then(data => {
    alert(data.message || 'Members removed successfully');
    document.getElementById('chat-remove-members-input').value = '';
    document.getElementById('chat-admin-members-select').dispatchEvent(new Event('change'));
  }).catch(err => {
    alert(err.message);
  });
});

document.getElementById('new-announcement-button').addEventListener('click', () => {
  const message = document.getElementById('new-announcement-input').value.trim();
  const scope = document.getElementById('new-announcement-scope-input').value;

  if (!message) return alert('Please enter an announcement');

  let conversationId = null;
  if (scope === 'here') {
    conversationId = document.getElementById('new-announcement-chat-input').value;
    if (!conversationId) return alert('Please select a chat for "here" scope');
  }

  fetch('/api/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      message,
      scope,
      conversationId
    })
  }).then(async r => {
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to create announcement');
    }
    return r.json();
  }).then(data => {
    alert('Announcement created successfully');
    document.getElementById('new-announcement-input').value = '';
  }).catch(err => {
    alert(err.message);
  });
});

function updateSqlBuilder() {
  const checkedRadio = document.querySelector('input[name="sql-db-radio"]:checked');
  if (!checkedRadio) return;
  const tableName = checkedRadio.value;

  document.querySelectorAll('.table-name-display').forEach(el => {
    el.textContent = tableName;
  });

  updateSqlPreview();
}

function updateSqlPreview() {
  const commandType = document.getElementById('sql-command-type').value;
  const checkedRadio = document.querySelector('input[name="sql-db-radio"]:checked');
  if (!checkedRadio) return;
  const tableName = checkedRadio.value;

  let sql = '';

  if (commandType === 'SELECT') {
    const columns = document.getElementById('sql-select-columns').value || '*';
    const where = document.getElementById('sql-select-where').value;
    sql = `SELECT ${columns} FROM ${tableName}`;
    if (where) sql += ` WHERE ${where}`;
  } else if (commandType === 'UPDATE') {
    const set = document.getElementById('sql-update-set').value || 'column = value';
    const where = document.getElementById('sql-update-where').value || 'id = ?';
    sql = `UPDATE ${tableName} SET ${set} WHERE ${where}`;
  } else if (commandType === 'INSERT') {
    const columns = document.getElementById('sql-insert-columns').value || '(column1, column2)';
    const values = document.getElementById('sql-insert-values').value || "('value1', 'value2')";
    sql = `INSERT INTO ${tableName} ${columns} VALUES ${values}`;
  } else if (commandType === 'DELETE') {
    const where = document.getElementById('sql-delete-where').value || 'id = ?';
    sql = `DELETE FROM ${tableName} WHERE ${where}`;
  }

  document.getElementById('sql-preview-text').textContent = sql;
}

document.getElementById('sql-command-type').addEventListener('change', () => {
  const commandType = document.getElementById('sql-command-type').value;

  document.querySelectorAll('.sql-command-builder').forEach(el => el.style.display = 'none');

  if (commandType === 'SELECT') {
    document.getElementById('sql-select-builder').style.display = 'block';
  } else if (commandType === 'UPDATE') {
    document.getElementById('sql-update-builder').style.display = 'block';
  } else if (commandType === 'INSERT') {
    document.getElementById('sql-insert-builder').style.display = 'block';
  } else if (commandType === 'DELETE') {
    document.getElementById('sql-delete-builder').style.display = 'block';
  }

  updateSqlBuilder();
});

document.querySelectorAll('#sql-select-columns, #sql-select-where, #sql-update-set, #sql-update-where, #sql-insert-columns, #sql-insert-values, #sql-delete-where').forEach(input => {
  input.addEventListener('input', updateSqlPreview);
});

function formatAsTable(data, title) {
  if (!data || data.length === 0) return `<h4>${title}</h4><p>No results</p>`;

  const keys = Object.keys(data[0]);
  let html = `<h4>${title}</h4><table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; margin: 10px 0;">`;
  html += '<thead><tr>';
  keys.forEach(key => {
    html += `<th style="background: #333; color: white; padding: 8px;">${key}</th>`;
  });
  html += '</tr></thead><tbody>';

  data.forEach(row => {
    html += '<tr>';
    keys.forEach(key => {
      html += `<td style="padding: 8px; border: 1px solid #ddd;">${row[key] !== null ? row[key] : '<em>null</em>'}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

document.getElementById('sql-db-button').addEventListener('click', () => {
  const checkedRadio = document.querySelector('input[name="sql-db-radio"]:checked');
  if (!checkedRadio) return alert('Please select a table first');
  const table = checkedRadio.value;
  const command = document.getElementById('sql-preview-text').textContent;
  if (!command) return alert('Please build a SQL command');

  fetch('/api/admin/sqlDbExecute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, command, name: localStorage.getItem('admin-name'), password: localStorage.getItem('admin-password') })
  }).then(async r => {
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || 'SQL execution failed');
    }
    return r.json();
  }).then(data => {
    let output = '';
    if (data.result && data.result.length > 0) {
      output += formatAsTable(data.result, 'SQL Command Result');
    } else {
      output += '<h4>SQL Command Result</h4><p>Command executed successfully (no rows returned)</p>';
    }
    if (data.tableState && data.tableState.length > 0) {
      output += formatAsTable(data.tableState, `Current Table State: ${table}`);
    } else {
      output += `<h4>Current Table State: ${table}</h4><p>Table is empty</p>`;
    }
    document.getElementById('sql-db-output').innerHTML = output;
  }).catch(err => {
    alert(err.message || 'Network/SQL error. Try refreshing.');
  });
});

document.getElementById('status-button').addEventListener('click', () => {
  const status = document.getElementById('status-input').value;
  if (!status) return alert('Please enter a status');

  fetch('/api/admin/updateStatus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, name: localStorage.getItem('admin-name'), password: localStorage.getItem('admin-password') })
  }).then(async r => {
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || 'Status update failed');
    }
    return r.json();
  }).then(data => {
    document.getElementById('status-output').innerHTML = `<span style="color: green;">${data.message || 'Status updated successfully'}</span>`;
  }).catch(err => {
    alert(err.message || 'Network/status error. Try refreshing.');
  });
});

document.getElementById('reset-password-button').addEventListener('click', () => {
  const username = document.getElementById('reset-password-username-input').value.trim();
  const newPassword = document.getElementById('reset-password-newpassword-input').value;

  if (!username || !newPassword) return alert('Please enter both username and new password');

  fetch('/api/admin/resetPassword', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      newPassword,
      name: localStorage.getItem('admin-name'),
      password: localStorage.getItem('admin-password')
    })
  }).then(async r => {
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || 'Password reset failed');
    }
    return r.json();
  }).then(data => {
    alert(data.message || 'Password reset successfully');
    document.getElementById('reset-password-username-input').value = '';
    document.getElementById('reset-password-newpassword-input').value = '';
  }).catch(err => {
    alert(err.message || 'Network/password reset error. Try refreshing.');
  });
});

