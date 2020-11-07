
// node notifier lib
const notifier = require('node-notifier')

// a notification to display
const message = {
  title: 'My title',
  message: 'A damn good message !',
  sound: false, // true | false.
  time: 2000, // How long to show balloon in ms
  wait: false, // Wait for User Action against Notification
  type: 'info', // The notification type : info | warn | error
}

// this basic usage is supposed to use any method available in actual env
// but ...
// on Win 7/8 it just do nothing
notifier.notify(message)

// because this works on Win 10+
const WindowsToaster = require('node-notifier/notifiers/toaster')
new WindowsToaster().notify('WindowsToaster message :)')

// this works only if Growl is running
const Growl = require('node-notifier/notifiers/growl')
new Growl().notify('Growl message :)')

// this works on Win 7/8
const WindowsBalloon = require('node-notifier/notifiers/balloon')
const WindowsBalloonNotifier = new WindowsBalloon()
WindowsBalloonNotifier.notify(message)
