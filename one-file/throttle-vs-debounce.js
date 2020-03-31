// this counter allow us to see how many times doStuff is executed
var doStuffExecutionNumber = 0

// this is the precious function we need to take care
// calling it too many times is bad for your business
var doStuff = () => console.info('doStuff EXECUTION ' + (++doStuffExecutionNumber) + showTiming())

// the period to wait to execute doStuff
var waitFor = 2000

/*************************************************************************************************
 * This will be the function that will be harassed and that will protect doStuff from suffering *
 *************************************************************************************************/

// un-comment one of these examples to test it by yourself

/*
 -#######------------------------------------------------#---
 -#-------#----#---##---#----#-#####--#------######-----##---
 -#--------#--#---#--#--##--##-#----#-#------#---------#-#---
 -#####-----##---#----#-#-##-#-#----#-#------#####-------#---
 -#---------##---######-#----#-#####--#------#-----------#---
 -#--------#--#--#----#-#----#-#------#------#-----------#---
 -#######-#----#-#----#-#----#-#------######-######----#####-
 ------------------------------------------------------------
 */

// As soon as possible every waitFor milliseconds, including the first (leading) & last (trailing) one
/*
 calling doStuffOnTime @2ms
 doStuff EXECUTION 1   @2ms
 calling doStuffOnTime @301ms  (+ 300ms)
 calling doStuffOnTime @601ms  (+ 300ms)
 calling doStuffOnTime @901ms  (+ 300ms)
 calling doStuffOnTime @1201ms (+ 300ms)
 calling doStuffOnTime @1501ms (+ 300ms)
 calling doStuffOnTime @1801ms (+ 300ms)
 doStuff EXECUTION 2   @1801ms
 calling doStuffOnTime @2101ms (+ 300ms)
 calling doStuffOnTime @2401ms (+ 300ms)
 calling doStuffOnTime @2701ms (+ 300ms)
 calling doStuffOnTime @3001ms (+ 300ms)
 calling doStuffOnTime @3300ms (+ 300ms)
 calling doStuffOnTime @3601ms (+ 300ms)
 calling doStuffOnTime @3901ms (+ 300ms)
 doStuff EXECUTION 3   @3901ms
 calling doStuffOnTime @4201ms (+ 300ms)
 calling doStuffOnTime @4501ms (+ 300ms)
 calling doStuffOnTime @4801ms (+ 300ms)
 calling doStuffOnTime @5101ms (+ 300ms)
 calling doStuffOnTime @5401ms (+ 300ms)
 calling doStuffOnTime @5701ms (+ 300ms)
 doStuff EXECUTION 4   @5701ms
 */
// var doStuffOnTime = _.throttle(doStuff, waitFor);

/*
 -#######-----------------------------------------------#####--
 -#-------#----#---##---#----#-#####--#------######----#-----#-
 -#--------#--#---#--#--##--##-#----#-#------#---------------#-
 -#####-----##---#----#-#-##-#-#----#-#------#####------#####--
 -#---------##---######-#----#-#####--#------#---------#-------
 -#--------#--#--#----#-#----#-#------#------#---------#-------
 -#######-#----#-#----#-#----#-#------######-######----#######-
 --------------------------------------------------------------
 */

// As soon as possible every waitFor milliseconds, leading: false, avoiding the first one
/*
 calling doStuffOnTime @2ms
 calling doStuffOnTime @301ms  (+ 300ms)
 calling doStuffOnTime @601ms  (+ 300ms)
 calling doStuffOnTime @901ms  (+ 300ms)
 calling doStuffOnTime @1201ms (+ 300ms)
 calling doStuffOnTime @1501ms (+ 300ms)
 calling doStuffOnTime @1801ms (+ 300ms)
 calling doStuffOnTime @2101ms (+ 300ms)
 doStuff EXECUTION 1   @2101ms
 calling doStuffOnTime @2401ms (+ 300ms)
 calling doStuffOnTime @2701ms (+ 300ms)
 calling doStuffOnTime @3001ms (+ 299ms)
 calling doStuffOnTime @3300ms (+ 299ms)
 calling doStuffOnTime @3600ms (+ 300ms)
 calling doStuffOnTime @3900ms (+ 300ms)
 calling doStuffOnTime @4200ms (+ 300ms)
 doStuff EXECUTION 2   @4200ms
 calling doStuffOnTime @4500ms (+ 300ms)
 calling doStuffOnTime @4800ms (+ 300ms)
 calling doStuffOnTime @5100ms (+ 300ms)
 calling doStuffOnTime @5400ms (+ 300ms)
 calling doStuffOnTime @5700ms (+ 300ms)
 doStuff EXECUTION 3   @5701ms
 */
// var doStuffOnTime = _.throttle(doStuff, waitFor, { leading: false });

/*
 -#######-----------------------------------------------#####--
 -#-------#----#---##---#----#-#####--#------######----#-----#-
 -#--------#--#---#--#--##--##-#----#-#------#---------------#-
 -#####-----##---#----#-#-##-#-#----#-#------#####------#####--
 -#---------##---######-#----#-#####--#------#---------------#-
 -#--------#--#--#----#-#----#-#------#------#---------#-----#-
 -#######-#----#-#----#-#----#-#------######-######-----#####--
 --------------------------------------------------------------
 */

// As soon as possible every waitFor milliseconds, leading & trailing: false, avoiding the first & last one
/*
 calling doStuffOnTime @2ms
 calling doStuffOnTime @301ms  (+ 300ms)
 calling doStuffOnTime @601ms  (+ 300ms)
 calling doStuffOnTime @901ms  (+ 300ms)
 calling doStuffOnTime @1201ms (+ 300ms)
 calling doStuffOnTime @1501ms (+ 300ms)
 calling doStuffOnTime @1801ms (+ 300ms)
 calling doStuffOnTime @2101ms (+ 300ms)
 doStuff EXECUTION 1   @2101ms
 calling doStuffOnTime @2401ms (+ 300ms)
 calling doStuffOnTime @2701ms (+ 300ms)
 calling doStuffOnTime @3001ms (+ 299ms)
 calling doStuffOnTime @3300ms (+ 299ms)
 calling doStuffOnTime @3600ms (+ 300ms)
 calling doStuffOnTime @3900ms (+ 300ms)
 calling doStuffOnTime @4200ms (+ 300ms)
 doStuff EXECUTION 2   @4200ms
 calling doStuffOnTime @4500ms (+ 300ms)
 calling doStuffOnTime @4800ms (+ 300ms)
 calling doStuffOnTime @5100ms (+ 300ms)
 calling doStuffOnTime @5400ms (+ 300ms)
 calling doStuffOnTime @5700ms (+ 300ms)
 */
// var doStuffOnTime = _.throttle(doStuff, waitFor, { leading: false, trailing: false });

/*
 -#######----------------------------------------------#-------
 -#-------#----#---##---#----#-#####--#------######----#----#--
 -#--------#--#---#--#--##--##-#----#-#------#---------#----#--
 -#####-----##---#----#-#-##-#-#----#-#------#####-----#----#--
 -#---------##---######-#----#-#####--#------#---------#######-
 -#--------#--#--#----#-#----#-#------#------#--------------#--
 -#######-#----#-#----#-#----#-#------######-######---------#--
 --------------------------------------------------------------
 */

// Will execute doStuff execution waitFor milliseconds after every calls ends, once
/*
 calling doStuffOnTime @1ms
 calling doStuffOnTime @300ms  (+ 300ms)
 calling doStuffOnTime @600ms  (+ 300ms)
 calling doStuffOnTime @900ms  (+ 300ms)
 calling doStuffOnTime @1200ms (+ 300ms)
 calling doStuffOnTime @1500ms (+ 300ms)
 calling doStuffOnTime @1800ms (+ 300ms)
 calling doStuffOnTime @2100ms (+ 300ms)
 calling doStuffOnTime @2400ms (+ 300ms)
 calling doStuffOnTime @2700ms (+ 300ms)
 calling doStuffOnTime @3000ms (+ 300ms)
 calling doStuffOnTime @3300ms (+ 300ms)
 calling doStuffOnTime @3600ms (+ 300ms)
 calling doStuffOnTime @3900ms (+ 300ms)
 calling doStuffOnTime @4200ms (+ 300ms)
 calling doStuffOnTime @4500ms (+ 300ms)
 calling doStuffOnTime @4800ms (+ 300ms)
 calling doStuffOnTime @5100ms (+ 300ms)
 calling doStuffOnTime @5400ms (+ 300ms)
 calling doStuffOnTime @5700ms (+ 300ms)
 doStuff EXECUTION 1   @5700ms
 */

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce (func, wait, immediate) {
  var timeout
  return () => {
    var context = this
    var args = arguments
    var later = () => {
      timeout = null
      if (!immediate) func.apply(context, args)
    }
    var callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func.apply(context, args)
  }
}
var doStuffOnTime = debounce(doStuff, waitFor)

// this function just log each harassment
var tryToDoStuffRightNow = () => {
  console.log('calling doStuffOnTime' + showTiming(true))
  doStuffOnTime()
}

// just return a timestamp in ms
// divide by 1000 to have seconds
var timestamp = () => new Date().getTime()

var isFirstStep = true
var showTiming = (isStep) => {
  timestampStepDiff = timestampStep - timestamp()
  if (isStep) {
    timestampStep = timestamp()
  }
  if (isFirstStep) {
    // just avoid showing a fake diff
    isFirstStep = false
    isStep = false
  }
  return ' @' + Math.abs(timestampStart - timestampStep) + 'ms ' + (isStep ? '(+ ' + Math.abs(timestampStepDiff) + 'ms)' : '')
}

var timestampStart = timestamp()
var timestampStep
var timestampStepDiff
var executingTimes = 20
var executingEach = 300
console.clear()

// simulate [executingTimes] calls separated by [executingEach]ms time period
for (var i = 0; i < executingTimes; i++) {
  var time = i * executingEach
  setTimeout(tryToDoStuffRightNow, time)
}
