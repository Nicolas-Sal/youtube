const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Playlist autoplay disable', () => {
	let playlistJs;

	beforeAll(() => {
		playlistJs = fs.readFileSync(
			path.join(__dirname, '../../js&css/web-accessible/www.youtube.com/playlist.js'),
			'utf8'
		);
	});

	test('stops queued autoplay when the current playlist index is zero', () => {
		const playlistData = {
			currentIndex: 0,
			totalVideos: 2,
			localCurrentIndex: 0
		};
		const ImprovedTube = {
			storage: { playlist_up_next_autoplay: false },
			elements: { ytd_watch: { playlistData } }
		};
		const isQueue = playlistJs.match(
			/ImprovedTube\.isQueue = function \(player\) \{[\s\S]*?\n\};/
		)[0];
		const handler = playlistJs.match(
			/ImprovedTube\.playlistUpNextAutoplay = function \(event\) \{[\s\S]*?\n\};/
		)[0];

		vm.runInNewContext(`${isQueue}\n${handler}`, {
			ImprovedTube,
			location: { href: 'https://www.youtube.com/watch?v=current' }
		});
		ImprovedTube.playlistUpNextAutoplay();

		expect(playlistData.currentIndex).toBe(2);
	});

	test('marks a queued video as not user-started when it ends with either playlist autoplay option disabled', () => {
		const ImprovedTube = {
			storage: { playlist_autoplay: false, playlist_up_next_autoplay: true },
			elements: { player: { getPlaylist: () => ['current', 'queued'] } },
			user_interacted: true
		};
		const isQueue = playlistJs.match(
			/ImprovedTube\.isQueue = function \(player\) \{[\s\S]*?\n\};/
		)[0];
		const handler = playlistJs.match(
			/ImprovedTube\.playlistUpNextAutoplay = function \(event\) \{[\s\S]*?\n\};/
		)[0];

		vm.runInNewContext(`${isQueue}\n${handler}`, {
			ImprovedTube,
			location: { href: 'https://www.youtube.com/watch?v=current&list=TLPQMDMxMTIwMjb2' }
		});
		ImprovedTube.playlistUpNextAutoplay({ type: 'ended' });

		expect(ImprovedTube.user_interacted).toBe(false);
	});

	test('does not treat a regular YouTube playlist as an Add to queue list', () => {
		const ImprovedTube = {};
		const isQueue = playlistJs.match(
			/ImprovedTube\.isQueue = function \(player\) \{[\s\S]*?\n\};/
		)[0];

		vm.runInNewContext(isQueue, {
			ImprovedTube,
			location: { href: 'https://www.youtube.com/watch?v=current&list=PLregularplaylist' }
		});

		expect(ImprovedTube.isQueue({ getPlaylist: () => ['current', 'next'] })).toBe(false);
	});

	test('the watch-page play hook applies the playlist options to queue playback', () => {
		const functionsJs = fs.readFileSync(
			path.join(__dirname, '../../js&css/web-accessible/functions.js'),
			'utf8'
		);

		expect(functionsJs).toContain('const queueAutoplayDisabled = ImprovedTube.isQueue?.(player)');
		expect(functionsJs).toContain('ImprovedTube.storage.playlist_autoplay === false || ImprovedTube.storage.playlist_up_next_autoplay === false');
		expect(functionsJs).toContain('||queueAutoplayDisabled');
	});
});
