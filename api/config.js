module.exports = {
    mongodb: {
        playtomic: process.env.playtomic || // manual setup
                   process.env.MONGOLAB_URI ||  // new 'deploy to heroku'
                   "mongodb://127.0.0.1:27017/playtomic" // local testing
    },
	mailchimp: {
		apikey: process.env.mailchimp,
		listid: process.env.mailchimp_listid,
		doubleoptin: process.env.mailchimp_doubleoptin || true,
		updateexisting: process.env.mailchimp_allowupdates || true,
		apiurl: (function parseAPIUrl() {
        	if(!process.env.mailchimp) {
        		return null;
        	}
        
        	var apikey = process.env.mailchimp;
        	var dc = apikey.substring(apikey.indexOf("-") + 1);
        	return dc + ".api.mailchimp.com";
        })()
	}
};