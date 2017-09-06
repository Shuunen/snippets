angular
    .module('app', [])
    .controller('HelloController', function ($scope, $http) {

        console.log('in hello ctrl')

        $scope.greeting = 'Hello World'

        var user = 'DevOps'
        var pass = 'Niji@2016'
        var url = 'http://verlingue-symfony.service.dmz.wf.niji.delivery/api/version'
        var url2 = 'http://localhost:3000'
        var auth = 'Basic ' + btoa(user + ':' + pass)
        var auth2 = 'Basic ' + btoa('foo:bar')

        var request = {
            method: 'GET',
            url: url2,
            headers: {
                Authorization: auth2
            }
        }

        console.log('starting request...')

        $http(request)
            .then(response => {
                console.log('got response', response)
            })
            .catch(error => {
                console.error('got error', error)
            })

        /*var fetchHeaders = new Headers({
            Authorization: auth
        })*/

        /*
        let fetchHeaders = new Headers()
        // fetchHeaders.append('Content-Type', 'text/json')
        fetchHeaders.append('Authorization', auth)


        var fetchOptions = {
            method: 'GET',
            headers: fetchHeaders,
            mode: 'no-cors',
            cache: 'no-cache'
        }

        fetch(url, fetchOptions)
            .then(function (response) {
                console.log('got response', response)
                if (response.ok) {
                    response.json().then(function (data) {
                        console.log('got data', data)
                    })
                } else {
                    console.warn('bad response')
                }
            })
            .catch(error => {
                console.error('got error', error)
            })
        */
    })
