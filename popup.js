document.addEventListener('DOMContentLoaded', function(){
  var regex_p = /.*\.([^\.]+)\.[com|net|org|info|coop|int|co|jobs|us|uk|fr|cn]/;
  var url;
  var name_of_company;
  var exsiting_jobs;
  
  init();
  
  // UPDATE PLACEHOLDER FOR INPUT ELEMENTS
  chrome.tabs.getSelected(null, function(tab){
    chrome.storage.sync.get('jobs', function(result){
      for(var j in result.jobs){ // j will store insdex in jobs
        j = JSON.parse(result.jobs[j]);
        if(j){
          display_row(j);
        }
      }
    });
    url = tab.url;
    if(url){
      regex_result = regex_p.exec(url);
      if(regex_result){
        name_of_company = (regex_result)[1];
        $('#cmpy').attr('placeholder', name_of_company);
        $('#posi').attr('placeholder', 'position');
      }
    }
  });
  
  init_add_button(name_of_company, url);
  init_clear_button();
  
});

class Job{
  constructor(name, url, note){
    this.apply_time = (new Date()).toLocaleDateString().slice(0, -5);
    this.cmpy_name  = name;
    this.cmpy_url   = url;
    this.reply_rslt = 0;   // 0: no reply, 1: replied
    this.note       = note;
  }
} // END CLASS

function init(){
  chrome.storage.sync.get({acc_j_id: -1}, function(result){
    if(result.acc_j_id != -1){ // USER HAD ALREADY ADDED ENTREIS
      //console.log(result.acc_j_id);
      chrome.storage.sync.get('jobs', function(result){
        console.log('[init function] ' + result.jobs);
      });
    }
    else{ // result.acc_j_id HAS DEFAULT VALUE (user is new)
      chrome.storage.sync.set({acc_j_id: 0}, function(result){
        console.log('[init function] acc_j_id in storage area.');
      });
    }
  });
}

function clear_history(){
  $('#tbl > tbody').each(function() {
    $(this).remove();
  });
  chrome.storage.sync.clear(function (result){
    chrome.storage.sync.set({acc_j_id: 0}, function(result){
      console.log('[INIT] acc_j_id in storage area.');
    });
  });
}

function check_update(s_id){
  var arr = s_id.split('^');
  chrome.storage.sync.get('jobs', function(result){
    var temp_arr = result['jobs']? result['jobs']: [];
    for(var jb in temp_arr){
      if(temp_arr[jb] == null){
        continue;
      }
      var job_obj = JSON.parse(temp_arr[jb]);
      if(job_obj.cmpy_url == arr[0] && job_obj.apply_time == arr[1]){
        job_obj.reply_rslt = (job_obj.reply_rslt == 0 || job_obj.reply_rslt == -1)? 1: 0;
        temp_arr[jb] = JSON.stringify(job_obj);
        break;
      }
    }
    chrome.storage.sync.set({'jobs': temp_arr}, function(result){
      console.log('[SET] delete entry');
    });
  });
}

function get_toggle_switch(rslt, s_id){
  var check_box_div = $('<div/>', {'class': 'onoffswitch' });
  var check_box = $('<input/>', {
    'type': 'checkbox',
    'name': 'onoffswitch',
    'class': 'onoffswitch-checkbox',
    'id': s_id
  });
  if(rslt == 1){
    check_box.prop('checked', true);
  }
  else{
    check_box.prop('checked', false);
  }
  // add listener
  check_box.change(function(){check_update(s_id);});
  var check_box_label=$('<label/>',{'class': 'onoffswitch-label','for': s_id});
  var span_on = $('<span/>', {'class': 'onoffswitch-inner'});
  var span_off = $('<span/>', {'class': 'onoffswitch-switch'});
  
  check_box_label.append(span_on);
  check_box_label.append(span_off);
  check_box_div.append(check_box);
  check_box_div.append(check_box_label);
  
  return check_box_div;
}

/**
 * TO-DO: bug need to fix - not working
 */
function get_delete_button(){
  var new_button = $('<button/>', {
    'text': 'DELETE',
    'class': 'pure-button pure-button-primary dButton'
  });
  new_button.css('text-weight', 'bold');
  $('table').on('click', '.dButton', function(){
    var del_url = $(this).closest('tr').find('td a').attr('href');
    chrome.storage.sync.get('jobs', function(result){
      var temp_arr = result['jobs']? result['jobs']: [];
      for(var jb in temp_arr){
        if(temp_arr[jb] == null){
          continue;
        }
        var j_obj = JSON.parse(temp_arr[jb]);
        if(j_obj.cmpy_url == del_url){
          delete temp_arr[jb];
          break;
        }
      }
      chrome.storage.sync.set({'jobs': temp_arr}, function(result){
        console.log('[SET] delete entry');
      });
    });
    $(this).closest('tr').remove();
  });
  return new_button;
}

function get_link(name, url, note){
  var new_link = $('<a/>', { 'href': url, 'text': name });
  new_link.click(function(){ chrome.tabs.create({url: url}); });
  var new_span = $('<span/>');
  new_span.append(note);
  new_link.append(new_span);
  
  return new_link;
}

function display_row(job_input){
  var new_row = $('<tr/>', { 'class': 'pure-table-odd' });
  var new_cell = $('<td/>');
  new_cell.append(job_input.apply_time);
  new_row.append(new_cell);
  new_cell = $('<td/>');
  new_cell.append(get_toggle_switch(job_input.reply_rslt, job_input.cmpy_url + '^' + job_input.apply_time));
  new_row.append(new_cell);
  new_cell = $('<td/>');
  new_cell.append(get_link(job_input.cmpy_name, job_input.cmpy_url, job_input.note));
  new_row.append(new_cell);
  new_cell = $('<td/>');
  new_cell.append(get_delete_button());
  new_row.append(new_cell);
  $('#tbl').append(new_row);
}

function init_add_button(name_of_company, url){
  var add = document.getElementById('addButton');
  if(add){
    add.addEventListener('click', function(){
      chrome.tabs.getSelected(null, function(tab){
        var url = tab.url;
        var position_applied = 'n/a';
        var notes;
        var name_of_company;
        if($.trim($('#cmpy').val()) == ''){
          // CHECK IF THERE IS USER INPUT; IF SO, USE DEFAULT WHICH IS THE VALUE
          // OF THE PLACEHOLDER
          name_of_company = $('#cmpy').attr('placeholder');  
        }
        else{
          name_of_company = $('#cmpy').val();
        }
        if($.trim($('#posi').val()) != '' && typeof $.trim($('#posi').val()) !== "undefine"){
          position_applied = 'pos: ' + $.trim($('#posi').val());
        }
        if(position_applied != 'n/a'){
          notes = position_applied;
          if($.trim($('#note').val()) != ''){
            notes += '<br/> note: ' + $.trim($('#note').val());
          }
        }
        else{
          notes = $.trim($('#note').val());
        }
        var new_job = new Job(name_of_company, url, notes);
        chrome.storage.sync.get({acc_j_id: -1}, function(result){
          var curr_j_id = result.acc_j_id;
          if(curr_j_id != -1){
            /* user is not a new user. */
            /* update acc_j_id */
            chrome.storage.sync.set({acc_j_id: curr_j_id + 1}, function(result){
              console.log('[SET] accumulate job id = ' + (curr_j_id + 1));
            });
            /* update db with new job object */
            chrome.storage.sync.get('jobs', function(result){
              var temp_arr = result['jobs']? result['jobs']: [];
              temp_arr[curr_j_id] = JSON.stringify(new_job);
              chrome.storage.sync.set({'jobs': temp_arr}, function(result){
                console.log('[SET] new job ' + JSON.stringify(new_job));
              });
            });
          }
          else{
            /* new user */
            /* update acc_j_id */
            chrome.storage.sync.set({acc_j_id: 1}, function(result){
              console.log('[SET] accumulate job id = 0');
            });
            /* update db with new job object */
            chrome.storage.sync.set({
              jobs: {0: JSON.stringify(new_job)}
            });
          }
        });
        display_row(new_job);
      });
      });
  } // END IF
}

function init_clear_button(){
  var clear_button = document.getElementById('clearHistory');
  if(clear_button){
    clear_button.addEventListener('click', function(){
      clear_history();
    });
  }
}












