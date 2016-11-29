var debug = false;
var nonUsed = ["ux-terms-and-conditions", "ux-card-list", "ux-loading-indicator", "ux-loader", "ux-number-badges", "ux-offscreen-side-bar", "ux-sidenav-searchable", "ux-horizontal-bar-graph", "ux-date-of-birth", "ux-icon-block-button", "ux-icon-button", "ux-seperator", "ux-step-indicator", "ux-textarea", "ux-type-ahead", "ux-timestamped-link", "ux-store-details", "ux-request-sim-carousel", "ux-table-content", "ux-navigational-tile", "ux-change-amount", "ux-info-callout", "ux-toggle-nav", "ux-cost-summary", "ux-specification-cell", "ux-two-cta-table-cell", "ux-help-promo-card", "ux-profile-summary", "ux-text-link-icon-descriptor"];

function filterJira(args) {
	console.log('---' + "\n" + 'Filter starting...');
	var elements = document.querySelectorAll(args.elements);
	var counts = {
		global: 0,
		nonUsed: 0
	};
	var totalHidden = 0;
	var totalNotUsed = 0;
	console.log('will filter "' + args.elements + '" elements');
	[].forEach.call(elements, function (element) {
		var name = element.querySelector('.ghx-summary').textContent.trim().split(' - DEFECT')[0];
		var status = element.querySelector('.status').textContent.trim().toLowerCase();
		var componentUsed = (nonUsed.indexOf(name) === -1);
		if (debug) {
			console.log(name + ' has status "' + status + '" and is ' + (componentUsed ? '' : 'NOT') + ' used');
		}
		if (componentUsed) {
			// add count
			if (!counts.hasOwnProperty(status)) {
				counts[status] = 0;
			}
			counts[status] = counts[status] + 1;
			// hide if asked
			if (args.displayOnlyStatus && status.indexOf(args.displayOnlyStatus) === -1) {
				element.style.display = 'none';
				if (debug) {
					console.log(' - will be hidden because displayOnlyStatus option is set to "' + args.displayOnlyStatus + '"');
				}
			} else {
				element.style.display = 'inherit';
			}
		} else {
			// add count
			counts.nonUsed++;
			// hide if asked
			if (args.displayOnlyStatus) {
				element.style.display = 'none';
				if (debug) {
					console.log(' - will be hidden because displayOnlyStatus option is set');
				}
			} else {
				element.style.display = 'inherit';
			}
		}
		counts.global++;
	});
	var report = '';
	report += '---' + "\n" + 'Jira components status' + "\n" + '---' + "\n";
	report += counts.global + ' components in total' + "\n";
	var checkTotal = 0;
	report += counts.nonUsed + ' components are not used' + "\n";
	checkTotal += counts.nonUsed;
	delete counts.global;
	delete counts.nonUsed;
	for (var i in counts) {
		var count = counts[i];
		checkTotal += count;
		if ((count + '').length === 1) {
			count = '0' + count;
		}
		report += count + ' components marked as "' + i + '"' + "\n";
	}
	// report += checkTotal + ' components reported' + "\n";
	console.log(report);
}

filterJira({
	elements: '#ghx-issues-in-epic-table tr',
	displayOnlyStatus: 'ready for dev'
});
