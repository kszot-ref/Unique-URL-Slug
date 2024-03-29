var repeater = '';
var codename = '';
var itemid = '';
var itemCodename = '';
var generates_from = '';
var autogenerate = '[autogenerated]';
var force_uniqueness = "false";
var restricted_chars = '[^a-zA-Z0-9]';
var locale = '';

function updateDisabled(disabled) {
  if (disabled) {
    $('.disabled_overlay').show();
  }
  else {
    $('.disabled_overlay').hide();
  }
}

function setup(value) {
  setValue(value);

  $('body').on('input', '[contenteditable]', function () {
    autogenerate = '[manual]';
    isUnique($('#unique').text());
  });
  $("#autogenerate").on("click", function () {
    autogenerate = '[autogenerated]';
    returnValue(generates_from);
  });
}

function updateSize() {
  var height = 100;
  try {
    height = parseInt($("html").height());
  } catch (err) {
    console.error(err);
  }
  CustomElement.setHeight(height);
}

function initCustomElement() {
  try {
    CustomElement.init((element, _context) => {
      itemid = _context.item.id;
      itemCodename = _context.item.codename;
      locale = _context.variant.codename;
      // Setup with initial value and disabled state
      if (element.config) {
        if (element.config.repeater) {
          repeater = element.config.repeater;
        }
        else {
          showError("Missing 'Repeater' URL for proxying requests from this element to Preview API");
        }
        if (element.config.codename) {
          codename = element.config.codename;
        }
        else {
          showError("Missing codename of 'Custom URL Slug' element");
        }
        if (element.config.generates_from) {
          generates_from = element.config.generates_from;
        }
        else {
          showError("Missing source 'Text' element codename");
        }
        if (element.config.force_uniqueness) {
          force_uniqueness = element.config.force_uniqueness;
        }
        if (element.config.restricted_chars) {
          restricted_chars = element.config.restricted_chars;
        }
      }
      if (element.value) {
        autogenerate = JSON.parse(element.value)[1];
        setup(JSON.parse(element.value)[0]);
      }
      else {
        setup("");
      }

      updateDisabled(element.disabled);
      updateSize();
    });
    // React when the disabled state changes (e.g. when publishing the item)
    CustomElement.onDisabledChanged(updateDisabled);
  } catch (err) {
    // Initialization with the Custom elements API failed 
    // (page displayed outside of the Kentico Cloud UI)
    console.error(err);
    updateDisabled(true);
  }
}

initCustomElement();

CustomElement.observeElementChanges([], (changedElementCodenames) => {
  if (changedElementCodenames[0] == generates_from && autogenerate != '[manual]') {
    returnValue(changedElementCodenames[0]);
  }
})

function returnValue(codename) {
  CustomElement.getElementValue(codename, (value) => {
    setValue(value)
  });
}

function setValue(value) {
  var re = new RegExp(restricted_chars, "g");
  value = value.replace(re, '-');
  value = value.toLowerCase();
  $('#unique').text(value);
  isUnique(value);
}

function isUnique(text) {
  $('#unique').css("color", "unset");
  $('#unique-status').removeClass("item-status--is-successful");
  $('#unique-status').removeClass("item-status--failed");
  $('#unique-status').addClass("status-checking");
  $('#unique-status').text("checking");

  // HERE comes your own server proxy sevice that forwards JSON from Preview API based on "/items?elements.<codename>[contains]=<value>&depth=0" query
  var urlUnique = `${repeater}&item-codename=${itemCodename}&item-id=${itemid}&field-codename=${codename}&value=${text}&locale=${locale}`;
  $.ajax({
    url: urlUnique,
    dataType: 'text',
    success: function (data) {
      data = JSON.parse(data);
      if (text == $('#unique').text()) {
        $('#unique-status').removeClass("status-checking");
        $('#unique-status').removeClass("item-status--is-successful");
        $('#unique-status').removeClass("item-status--failed");
        var name = otherThanCurrent(data.items, text);
        if (data.items.length > 0 && name) {
          if (force_uniqueness == "true") {
            var uniqueValue = text + '-' + makeid(6);
            setValue(uniqueValue);
          }
          else {
            $('#unique').css("color", "red");
            $('#unique-status').addClass("item-status--failed");
            $('#unique-status').html("Not unique - value is used in <strong>" + name + "</strong> item " + autogenerate);
          }
        }
        else {
          $('#unique').css("color", "green");
          $('#unique-status').addClass("item-status--is-successful");
          $('#unique-status').text("Unique value " + autogenerate);
        }
      }
      var value = [text, autogenerate];
      CustomElement.setValue(JSON.stringify(value));
    }
  });
}

function otherThanCurrent(items, text) {
  if (items.length > 0) {
    for (var x = 0; x < items.length; x++) {
      if (items[x].system.id != itemid) {
        return items[x].system.name;
      }
    }
  }
  return null;
}

function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function showError(message) {
  $('#element').hide();
  $('#unique-status').css("color", "#ef5350");
  $('#unique-status').addClass("item-status--failed");
  $('#unique-status').text(message);
  throw new Error(message);
}
