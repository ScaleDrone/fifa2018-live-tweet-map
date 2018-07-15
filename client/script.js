angular.module('FIFA', [])
    .controller('tcontroller', tcontroller);

function tcontroller($scope) {

    $scope.scale_drone_channelId = '';  
    $scope.teams = {
        croatia: [],
        france: [],
    };

    const div = $('#map');
    div.css('height', $(window).height());

    const map = L.map('map', {
        center: [46.694640, 2.409687,],
        zoom: 3,
        minZoom: 2,
    });

    const croatiaIcon = L.icon({
        iconUrl: './icons/croatia.png',
        iconSize: [25, 15,], // size of the icon
    });

    const franceIcon = L.icon({
        iconUrl: './icons/france.png',
        iconSize: [25, 15,], // size of the icon
    });

    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://appgambit.com">AppGambit</a>',
    }).addTo(map);

    const drone = new ScaleDrone($scope.scale_drone_channelId);
    drone.on('open', function (error) {
        if (error) return console.error(error);

        map.invalidateSize();
        const room = drone.subscribe('fifa');

        room.on('open', function (error) {
            if (error) return console.error(error);
            console.log('Connected to the channel');
        });

        room.on('data', $scope.updateTeams);
    });

    $scope.updateTeams = (message) => {
        if (message.team === 'cro') {
            $scope.teams.croatia.push(message.loc);
        } else {
            $scope.teams.france.push(message.loc);
        }
    
        const id = L.marker([message.loc.lat, message.loc.lng,], {
            icon: message.team === 'cro' ? croatiaIcon : franceIcon,
            dragable: true,
            title: message.team === 'cro' ? 'Croatia' : 'France',
            autoPan: true,
            blur: 15,
        }).addTo(map).bindPopup(`<a href="${message.url}" target="_blank">@${message.name}</a>`);

        $scope.removeMarker(id);
        $scope.$apply();
    };

    $scope.removeMarker = (id) => {
        setTimeout(() => map.removeLayer(id), 2*60*1000);
    };
}