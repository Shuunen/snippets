angular
    .module('app', [])
    .controller('HelloController', function ($scope, $http) {

        $scope.greeting = 'Hello World'

        var url = 'http://localhost:3000'
        var auth = 'Basic ' + btoa('foo:bar')

        var request = {
            method: 'GET',
            url: url,
            headers: { Authorization: auth }
        }

        console.log('starting request...')

        $http(request)
            .then(response => console.log('got response', response))
            .catch(error => console.error('got error', error))
    })
