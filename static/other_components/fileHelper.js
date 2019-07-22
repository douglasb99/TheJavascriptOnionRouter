/*
 * taken from tutorial on fileBufferReader and hardly modified . WILL REFERENCE SOON. Only used for 
 * debugging so i can see easily the status of files being sent will remove from later iterations.  
 */
var fileHelper = (function() {
    
var progressHelper = {};
var outputPanel = document.querySelector('.output-panel');


function updateLabel(progress, label) {
          console.log('update label');
    if (progress.position == -1) return;
    var position = +progress.position.toFixed(2).split('.')[1] || 100;
    label.innerHTML = position + '%';
};

function onBegin(file) {
        var li = document.createElement('li');
        console.log('file helper called');
        li.title = file.name;
        li.innerHTML = '<label>0%</label> <progress></progress>';
        outputPanel.insertBefore(li, outputPanel.firstChild);
        progressHelper[file.uuid] = {
            li: li,
            progress: li.querySelector('progress'),
            label: li.querySelector('label')
        };
        progressHelper[file.uuid].progress.max = file.maxChunks;
    };
    
 function onProgress(chunk) {
              console.log('on progress called');
        var helper = progressHelper[chunk.uuid];
        helper.progress.value = chunk.currentPosition || chunk.maxChunks || helper.progress.max;
        updateLabel(helper.progress, helper.label);
    };
    
function onEnd  (file) {
        progressHelper[file.uuid].li.innerHTML = '<a href="' + file.url + '" target="_blank" download="' + file.name + '">' + file.name + '</a>';
    };   
   

    return {
        onBegin: onBegin,
        onProgress : onProgress,
        onEnd : onEnd
        
    };

})();
