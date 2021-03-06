$.fn.filterExtension = function(extension) {
  return this.filter(function() { 
    var filename = $(this).attr('data-file');
    if(filename.lastIndexOf('.')){
      return filename.substr(filename.lastIndexOf('.')+1) === extension; 
    }
  });
};

$.fn.filterSubExtension = function(extension) {
  return this.filter(function() { 
    var filename = $(this).attr('data-file');
    if(filename.lastIndexOf('.')){
      filename =  filename.substr(0,filename.lastIndexOf('.'));
      return filename.substr(filename.lastIndexOf('.')+1) === extension; 
    }
  });
};
function FilenameToMD5(filename, type) {
    d = new Date();
    return CryptoJS.MD5('owncloud|' + filename + "|" + d.getTime() + d.getMilliseconds() + "|" + type);
}


function FileToPad(dir,file){
  pad=this;
  pad.dir=dir;
  pad.file=file;
  pad.url='about:blank';
  //get file content using files app api
  $.get(
    OC.filePath('files','ajax','download.php')+'?dir='+dir+'&files='+file,
    function name(link) {
      pad.url=link.split('\n')[1].substr(4);
      pad.show();
    }
  );
}

FileToPad.prototype={  
  show:function(){
    $("#app-navigation").hide();
    $('#app-content').hide();
   /*  $("#editor").hide();
    $('#content table').hide();
    $('#controls').hide();*/
    //pad headline
    $('#content').append('<div id="filetopad_bar"><span>'+t('files_etherpad', 'Title')+':</span> <strong>'+pad.file.replace('.url','').replace('.pad','').replace('.calc','')+'</strong><span>, '+t('files_etherpad', 'public link')+': <a href="'+pad.url+'">'+pad.url+'</a></span>'+' <a id="filetopad_close">x</a></div><iframe style="width:100%;height:90%;display:block;" id="filetopad_frame" src="'+pad.url+'"></iframe>');
    $('#pageWidthOption').attr('selected','selected'); 
    $('#filetopad_close').click(function(){pad.hide();});
  },
  hide:function(){
    $("#app-navigation").show();
    $('#app-content').show();
    /* $('#controls').show();
    $('#content table').show();
    $('#editor').show();*/
    $('iframe').remove();
    //$('a.action').remove();
    $('#filetopad_bar').remove();
  }
};

function checkPadIcons(){
	if($('#fileList').length>0) {
		$('tr').filterAttr('data-type', 'file').filterExtension( 'url').attr('data-mime','text/x-url');
	    	$('tr').filterAttr('data-type', 'file').filterExtension( 'url').filterSubExtension( 'pad').children('td:first-child').css('background-image','url('+OC.imagePath('files_etherpad', 'pad32.png')+')');
	    	$('tr').filterAttr('data-type', 'file').filterExtension( 'url').filterSubExtension( 'calc').children('td:first-child').css('background-image','url('+OC.imagePath('files_etherpad', 'calc32.png')+')');
   	}
}

$(document).ready(function(){
  checkPadIcons();
  if ( typeof FileActions!=='undefined'){
	OCA.Files.fileActions.register('text/x-url',t('files_etherpad','Pad-it'), OC.PERMISSION_READ, '',function(filename){ pad=new FileToPad($('#dir').val(),filename); });
	OCA.Files.fileActions.setDefault('text/x-url',t('files_etherpad','Pad-it'));
  }
  //update file list for pads
  $('table#filestable').bind('html', function( event ) {
        checkPadIcons();
  }).initMutation('html');

  // Turn around a bug in the OC7 and Mutation ...
  //$('div#new').click(function() {
  //	 checkPadIcons();
  // });

  // New button hook
  if($('div#new>ul>li').length > 0) {  
    Files.getMimeIcon.cache = {} ;
  //create pad file type
    OCA.Files.Files.getMimeIcon('text/plain', function(icon) {
      $('<li><p>' + t('files_etherpad', 'Pad') + '</p></li>')
        .attr('id', 'newPadFile')
        .appendTo('div#new>ul')
        .css('background', 'url(' + OC.imagePath('files_etherpad', 'pad32.png') + ') no-repeat')
        .data('type', 'text')
        .off('click')
        .click(function() {
          //prevent double input
          if($(this).children('p').length==0)
            return;
          //show input for pad name
          $(this).children('p').remove();
          var form=$('<form></form>');
          var input=$('<input>');
          form.append(input);
          form.appendTo('#newPadFile');
          input.focus();
          form.submit(function(event){
            event.stopPropagation();
            event.preventDefault();
            //check pad name
            var rawfilename = input.val();
            if (rawfilename.length == 0) {
              $("#notification").text('');
              OC.Notification.show(t('files_etherpad', 'Padname cannot be empty'));
              return false;
            }
            var filename = FileList.getUniqueName(rawfilename+'.pad.url');
            //get etherpad url
            $.get(
              OC.filePath('files_etherpad', 'ajax', 'host.php'),
              {type:'pad'},
              function (url) {
                //generate .url file
                var content='[InternetShortcut]\nURL='+url+'/p/'+FilenameToMD5(rawfilename, 'etherpad');
                //send file to server using files app api
                $.post(
                  OC.filePath('files','ajax','newfile.php'),
                  {dir:$('#dir').val(),filename:filename,content:content},
                  function(result){
                    if (result.status == 'success') {
                      //update file list
                      var date=new Date();
                      //FileList.add(filename,0,date,false,false);
                      FileList.add(result.data, {animate: true});
                      var tr=$('tr').filterAttr('data-file',filename);
                      tr.attr('data-mime','text/x-url');
                      tr.attr('data-id', result.data.id);
                      var path = $('#dir').val();
                      OCA.Files.Files.getMimeIcon('text/plain',function(path){
                        tr.find('td.filename').attr('style','background-image:url('+OC.imagePath('files_etherpad', 'pad32.png')+')');
                      });
                      $("#notification").text('');
                      OC.Notification.show(t('files_etherpad', t('files_etherpad', 'New pad named ')+filename+t('files_etherpad', ' was created.')));
                    }
                    else
                      OC.dialogs.alert(result.data.message, 'Error');
                  }
                );
              }
            );
            //restore description, close new dialogue
            var li=form.parent();
            form.remove();
            li.append('<p>'+t('files_etherpad', 'Pad')+'</p>');
            $('#new>a').click();
          });
        });
     });
    //create calc file type
 
    OCA.Files.Files.getMimeIcon('text/plain', function(icon) {
      $('<li><p>' + t('files_etherpad', 'Calc') + '</p></li>')
        .attr('id', 'newCalcFile')
        .appendTo('div#new>ul')
        .css('background', 'url(' + OC.imagePath('files_etherpad', 'calc32.png') + ') no-repeat')
        .data('type', 'text')
        .off('click')
        .click(function() {
          //prevent double input
          if($(this).children('p').length==0)
            return;
          //show input for pad name
          $(this).children('p').remove();
          var form=$('<form></form>');
          var input=$('<input>');
          form.append(input);
          form.appendTo('#newCalcFile');
          input.focus();
          form.submit(function(event){
            event.stopPropagation();
            event.preventDefault();
            //check pad name
            var rawfilename = input.val();
            if (rawfilename.length == 0) {
              $("#notification").text('');
              OC.Notification.show(t('files_etherpad', 'Document name cannot be empty'));
              return false;
            }
            var filename = FileList.getUniqueName(rawfilename+'.calc.url');
            //get etherpad url
            $.get(
              OC.filePath('files_etherpad', 'ajax', 'host.php'),
              {type:'calc'},
              function (url) {
                //generate .url file
                var content='[InternetShortcut]\nURL='+url+'/'+FilenameToMD5(rawfilename, 'ethercalc');

                //send file to server using files app api
                $.post(
                  OC.filePath('files','ajax','newfile.php'),
                  {dir:$('#dir').val(),filename:filename,content:content},
                  function(result){
                    if (result.status == 'success') {
                      //update file list
                      var date=new Date();
		      FileList.add(result.data, {animate: true});
                      var tr=$('tr').filterAttr('data-file',filename);
                      tr.attr('data-mime','text/x-url');
                      tr.attr('data-id', result.data.id);
                      var path = $('#dir').val();
                      OCA.Files.Files.getMimeIcon('text/plain',function(path){
                        tr.find('td.filename').attr('style','background-image:url('+OC.imagePath('files_etherpad', 'calc32.png')+')');
                      });
                      $("#notification").text('');
                      OC.Notification.show(t('files_etherpad', t('files_etherpad', 'New document named ')+filename+t('files_etherpad', ' was created.')));
                    }
                    else
                      OC.dialogs.alert(result.data.message, 'Error');
                  }
                );
              }
            );
            //restore description, close new dialogue
            var li=form.parent();
            form.remove();
            li.append('<p>'+t('files_etherpad', 'Calc')+'</p>');
            $('#new>a').click();
          });
        });
    });
    
  }
});
