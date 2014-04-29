var datetime = require(__dirname + "/datetime.js");

var utils = module.exports = {

    /*base64encode: function (unencoded) {
        return new Buffer(unencoded || '').toString('base64');
    },*/

    base64decode: function (encoded) {
        return new Buffer(encoded || '', 'base64').toString('utf8');
    },

    toTimestamp: function(date) {
        return Math.round(date.getTime() / 1000);
    },

    fromTimestamp: function(date) {
        return new Date(date * 1000);
    },

    getJSONValue: function(str) {

        if(typeof(str) == "number" || typeof(str) == "boolean") {
            return str;
        }

        if(str.getDate) {
            return "\"" + datetime.format(str, "MM/dd/yyyy hh:mm:ss") + "\"";
        }

        return "\"" + str + "\"";
    },

    escape: function(str) {

        if(!str) {
            return "";
        }

        str = str.toString();
        str = str.split("%").join("%25");
        str = str.split(";").join("%3B");
        str = str.split("?").join("%3F");
        str = str.split("/").join("%2F");
        str = str.split(":").join("%3A");
        str = str.split("#").join("%23");
        str = str.split("&").join("%26");
        str = str.split("=").join("%3D");
        str = str.split("+").join("%2B");
        str = str.split("$").join("%24");
        str = str.split(",").join("%2C");
        str = str.split(" ").join("%20");
        str = str.split("<").join("%3C");
        str = str.split(">").join("%3E");
        str = str.split("~").join("%7E");
        str = str.split(",").join("%2C");
        return str;
    },

    unescape: function(str) {
        if(!str) {
            return "";
        }
        
        str = str.toString();
        str = str.split("%25").join("%");
        str = str.split("%3B").join(";");
        str = str.split("%3F").join("?");
        str = str.split("%2F").join("/");
        str = str.split("%3A").join(":");
        str = str.split("%23").join("#");
        str = str.split("%26").join("&");
        str = str.split("%3D").join("=");
        str = str.split("%2B").join("+");
        str = str.split("%24").join("$");
        str = str.split("%2C").join(",");
        str = str.split("%20").join(" ");
        str = str.split("%3C").join("<");
        str = str.split("%3E").join(">");
        str = str.split("%7E").join("~");
        str = str.split("%2C").join(",");
        return str;
    },

    toInt: function(o) {
        if(!o) {
            return 0;
        }

        var i;

        try  {
            i = parseInt(o, 10);
        }
        catch(s) {
            i = 0;
        }

        return i;
    },

    average: function(o1, o2) {
        var i1 = utils.toInt(o1);
        var i2 = utils.toInt(o2);

        if(i2 === 0) {
            return 0;
        }

        return i1 / i2;
    },

    friendlyDate: function(d) {

        var date;

        if(!d.getDay) {
            date = utils.fromTimestamp(d);
        } else {
            date = d;
        }

        var delta = Math.round((new Date() - date) / 1000);

        var minute = 60,
            hour = minute * 60,
            day = hour * 24;

        if (delta < 30) {
            return "just now";
        }

        if (delta < minute) {
            return delta + " seconds ago";
        }

        if (delta < 2 * minute) {
            return "a minute ago";
        }

        if (delta < hour) {
            return Math.floor(delta / minute) + " minutes ago";
        }

        if (Math.floor(delta / hour) == 1) {
            return "1 hour ago";
        }

        if (delta < day) {
            return Math.floor(delta / hour) + " hours ago";
        }

        if (delta < day * 2) {
            return "yesterday";
        }

        return date;
    },

    baseurl: function(url) {

        if(!url || url === "") {
            return "http://localhost";
        }

        url = this.unescape(url);

        while (url.indexOf(" ") > -1) {
            url = url.replace(" ", "");
        }

        if (url.indexOf("http://") !== 0) {

            if(url.indexOf("://") > -1) {
                url = "http" + url.substring(url.indexOf("://"));
            }
            else {
                url = "http://" + url;
            }
        }
        
        url = url.substring(7);

        if(url.indexOf("/") > -1) {
            url = url.substring(0, url.indexOf("/"));
        }
        
        if(url.indexOf("www.") === 0) {
            url = url.substring(4);
        }

        var basedomain = null;
        var checkindex = -1;
        var domainpart = "";
        var cleaned = url.replace("www.", "");

        while (checkindex < url.length - 1 && basedomain === null)  {

            checkindex++;

            if (cleaned[checkindex] != '.') {
                continue;
            }

            domainpart = cleaned.substring(checkindex + 1);

            if (domainparts.indexOf(domainpart) > -1) {
                basedomain = domainpart;
            }
        }

        // no base domain means ip address or problem
        if (!basedomain)
        {
            // check if ip
            if (url.indexOf(".") > -1)
            {
                var ipcheck = url;

                while(ipcheck.indexOf(".") > -1) {
                    ipcheck = ipcheck.replace(".", "");
                }

                try {
                    parseFloat(ipcheck);
                    return url;
                } catch(s) {
                }
            }

            return "localhost";
        }

        var finalurl = cleaned.substring(0, cleaned.indexOf("." + domainpart));

        if (finalurl.indexOf(".") > -1) {
            finalurl = finalurl.substring(finalurl.lastIndexOf(".") + 1);
        }

        finalurl += "." + domainpart;

        return finalurl;
    }
};

var domainparts = [
    "0.bg","1.bg","2.bg","2000.hu","3.bg","4.bg","5.bg","6.bg","6bone.pl","7.bg","8.bg","9.bg","a.bg","a.se",
    "aa.no","aarborte.no","ab.ca","abo.pa","ac","ac.ae","ac.at","ac.be","ac.ci","ac.cn","ac.cr","ac.gn","ac.im",
    "ac.in","ac.ir","ac.jp","ac.kr","ac.ma","ac.me","ac.mu","ac.mw","ac.ng","ac.pa","ac.pr","ac.rs","ac.ru",
    "ac.rw","ac.se","ac.sz","ac.th","ac.tj","ac.tz","ac.ug","ac.uk","ac.vn","aca.pro","academy.museum",
    "accident-investigation.aero","accident-prevention.aero","act.au","act.edu.au","act.gov.au","ad","ad.jp",
    "adm.br","adult.ht","adv.br","adygeya.ru","ae","ae.org","aejrie.no","aero","aero.mv","aero.tt","aerobatic.aero",
    "aeroclub.aero","aerodrome.aero","a?roport.ci","aeroport.fr","af","afjord.no","?fjord.no","ag","ag.it","agdenes.no",
    "agents.aero","agr.br","agrar.hu","agriculture.museum","agrigento.it","agrinet.tn","agro.pl","ah.cn","ah.no","ai",
    "aid.pl","aip.ee","air.museum","aircraft.aero","airguard.museum","airline.aero","airport.aero","air-surveillance.aero",
    "airtraffic.aero","air-traffic-control.aero","ak.us","aknoluokta.no","?k?oluokta.no","akrehamn.no","?krehamn.no",
    "al","al.it","al.no","?l.no","al.us","alabama.museum","alaheadju.no","?laheadju.no","aland.fi","alaska.museum",
    "alessandria.it","alesund.no","?lesund.no","algard.no","?lg?rd.no","alstahaug.no","alta.no","?lt?.no","altai.ru",
    "altoadige.it","alto-adige.it","alvdal.no","am","am.br","amber.museum","ambulance.aero","ambulance.museum",
    "american.museum","americana.museum","americanantiques.museum","americanart.museum","amli.no","?mli.no","amot.no",
    "?mot.no","amsterdam.museum","amur.ru","amursk.ru","amusement.aero","an","an.it","ancona.it","and.museum",
    "andasuolo.no","andebu.no","andoy.no","and?y.no","annefrank.museum","anthro.museum","anthropology.museum",
    "antiques.museum","ao","ao.it","aosta.it","aoste.it","ap.it","aq","aq.it","aquarium.museum","aquila.it","ar.com",
    "ar.it","ar.us","arboretum.museum","archaeological.museum","archaeology.museum","architecture.museum","ardal.no",
    "?rdal.no","aremark.no","arendal.no","arezzo.it","arkhangelsk.ru","arna.no","arq.br","art.br","art.dz","art.ht",
    "art.museum","art.pl","art.sn","artanddesign.museum","artcenter.museum","artdeco.museum","arteducation.museum",
    "artgallery.museum","arts.co","arts.museum","arts.nf","arts.ro","artsandcrafts.museum","as","?s.no","as.us",
    "ascolipiceno.it","ascoli-piceno.it","aseral.no","?seral.no","asia","asker.no","askim.no","askoy.no","ask?y.no",
    "askvoll.no","asmatart.museum","asn.lv","asnes.no","?snes.no","ass.km","assassination.museum","assedic.fr",
    "assisi.museum","assn.lk","asso.bj","asso.ci","asso.dz","asso.fr","asso.gp","asso.ht","asso.km","asso.mc","asso.nc",
    "asso.re","association.aero","association.museum","asti.it","astrakhan.ru","astronomy.museum","at","at.it",
    "atlanta.museum","atm.pl","ato.br","audnedaln.no","augustow.pl","aukra.no","aure.no","aurland.no","aurskog-holand.no",
    "aurskog-h?land.no","austevoll.no","austin.museum","australia.museum","austrheim.no","author.aero","auto.pl",
    "automotive.museum","av.it","avellino.it","averoy.no","aver?y.no","aviation.museum","avocat.fr","avoues.fr","aw","ax",
    "axis.museum","az","az.us","b.bg","b.se","ba","ba.it","babia-gora.pl","badaddja.no","b?d?ddj?.no","badajoz.museum",
    "b?rum.no","baghdad.museum","bahcavuotna.no","b?hcavuotna.no","bahccavuotna.no","b?hccavuotna.no","bahn.museum",
    "baidar.no","b?id?r.no","baikal.ru","bajddar.no","b?jddar.no","balat.no","b?l?t.no","bale.museum","balestrand.no",
    "ballangen.no","ballooning.aero","balsan.it","balsfjord.no","baltimore.museum","bamble.no","bar.pro","barcelona.museum",
    "bardu.no","bari.it","barlettaandriatrani.it","barletta-andria-trani.it","barreau.bj","barum.no","baseball.museum",
    "basel.museum","bashkiria.ru","baths.museum","batsfjord.no","b?tsfjord.no","bauern.museum","bb","bc.ca","bd.se","be",
    "bearalvahki.no","bearalv?hki.no","beardu.no","beauxarts.museum","bedzin.pl","beeldengeluid.museum","beiarn.no",
    "belau.pw","belgorod.ru","bellevue.museum","belluno.it","benevento.it","berg.no","bergamo.it","bergbau.museum",
    "bergen.no","berkeley.museum","berlevag.no","berlev?g.no","berlin.museum","bern.museum","beskidy.pl","bf","bg","bg.it",
    "bh","bi","bi.it","bialowieza.pl","bialystok.pl","bible.museum","bielawa.pl","biella.it","bieszczady.pl","bievat.no",
    "biev?t.no","bilbao.museum","bill.museum","bindal.no","bio.br","bir.ru","birdart.museum","birkenes.no",
    "birthplace.museum","biz","biz.at","biz.az","biz.bb","biz.ki","biz.mv","biz.mw","biz.nr","biz.pk","biz.pl","biz.pr",
    "biz.tj","biz.tt","biz.vn","bj","bj.cn","bjarkoy.no","bjark?y.no","bjerkreim.no","bjugn.no","bl.it","blog.br","bm",
    "bmd.br","bn.it","bo","bo.it","bo.nordland.no","b?.nordland.no","bo.telemark.no","b?.telemark.no","bodo.no","bod?.no",
    "bokn.no","boleslawiec.pl","bologna.it","bolt.hu","bolzano.it","bomlo.no","b?mlo.no","bonn.museum","boston.museum",
    "botanical.museum","botanicalgarden.museum","botanicgarden.museum","botany.museum","bozen.it","br","br.com","br.it",
    "brand.se","brandywinevalley.museum","brasil.museum","bremanger.no","brescia.it","brindisi.it","bristol.museum",
    "british.museum","britishcolumbia.museum","broadcast.museum","broker.aero","bronnoy.no","br?nn?y.no","bronnoysund.no",
    "br?nn?ysund.no","brumunddal.no","brunel.museum","brussel.museum","brussels.museum","bruxelles.museum","bryansk.ru",
    "bryne.no","bs","bs.it","bu.no","budejju.no","building.museum","burghof.museum","buryatia.ru","bus.museum","busan.kr",
    "bushey.museum","bw","by","bydgoszcz.pl","bygland.no","bykle.no","bytom.pl","bz","bz.it","c.bg","c.la","c.se","ca",
    "ca.it","ca.na","ca.us","caa.aero","cadaques.museum","cagliari.it","cahcesuolo.no","??hcesuolo.no","california.museum",
    "caltanissetta.it","cambridge.museum","campobasso.it","can.br","can.museum","canada.museum","capebreton.museum",
    "cargo.aero","carrier.museum","cartoonart.museum","casadelamoneda.museum","caserta.it","casino.hu","castle.museum",
    "castres.museum","cat","catania.it","catanzaro.it","catering.aero","cb.it","cbg.ru","cc","cc.na","cci.fr","cd","ce.it",
    "celtic.museum","center.museum","certification.aero","cf","cg","ch","ch.it","chambagri.fr","championship.aero",
    "charter.aero","chattanooga.museum","chel.ru","cheltenham.museum","chelyabinsk.ru","cherkassy.ua","chernigov.ua",
    "chernovtsy.ua","chesapeakebay.museum","chicago.museum","chieti.it","children.museum","childrens.museum",
    "childrensgarden.museum","chiropractic.museum","chirurgiens-dentistes.fr","chita.ru","chocolate.museum",
    "christiansburg.museum","chukotka.ru","chungbuk.kr","chungnam.kr","chuvashia.ru","ci","cieszyn.pl","cim.br",
    "cincinnati.museum","cinema.museum","circus.museum","city.hu","civilaviation.aero","civilisation.museum",
    "civilization.museum","civilwar.museum","ck.ua","cl","cl.it","clinton.museum","clock.museum","club.aero","club.tw",
    "cm","cmw.ru","cn","cn.com","cn.it","cn.ua","cng.br","cnt.br","co","co.ae","co.ag","co.ao","co.at","co.ba","co.bi",
    "co.bw","co.ci","co.cr","co.gg","co.gy","co.hu","co.id","co.il","co.im","co.in","co.ir","co.it","co.je","co.jp",
    "co.kr","co.lc","co.ls","co.ma","co.me","co.mu","co.mw","co.na","co.nz","co.pn","co.pw","co.rs","co.rw","co.st",
    "co.sz","co.th","co.tj","co.tt","co.tz","co.ug","co.uk","co.us","co.uz","co.vi","co.za","coal.museum",
    "coastaldefence.museum","cody.museum","coldwar.museum","collection.museum","colonialwilliamsburg.museum",
    "coloradoplateau.museum","columbia.museum","columbus.museum","com","com.ac","com.af","com.ag","com.ai","com.al",
    "com.an","com.ar","com.au","com.aw","com.az","com.ba","com.bb","com.bh","com.bi","com.bm","com.bo","com.br","com.bs",
    "com.by","com.bz","com.ci","com.cn","com.co","com.cu","com.dm","com.dz","com.ec","com.ee","com.es","com.fr","com.ge",
    "com.gh","com.gi","com.gn","com.gp","com.gr","com.gy","com.hk","com.hn","com.hr","com.ht","com.io","com.iq","com.is",
    "com.jo","com.kg","com.ki","com.km","com.ky","com.kz","com.la","com.lb","com.lc","com.lk","com.lr","com.lv","com.ly",
    "com.mg","com.mk","com.ml","com.mo","com.mu","com.mv","com.mw","com.mx","com.my","com.na","com.nf","com.ng","com.ni",
    "com.nr","com.pa","com.pe","com.pf","com.ph","com.pk","com.pl","com.pr","com.ps","com.pt","com.re","com.ro","com.ru",
    "com.rw","com.sa","com.sb","com.sc","com.sd","com.sg","com.sl","com.sn","com.st","com.sy","com.tj","com.tn","com.to",
    "com.tt","com.tw","com.ua","com.uy","com.uz","com.vc","com.vi","com.vn","com.ws","communication.museum","" +
        "communications.museum","community.museum","como.it","computer.museum","computerhistory.museum","comunica??es.museum",
    "conf.lv","conference.aero","consulado.st","consultant.aero","consulting.aero","contemporary.museum",
    "contemporaryart.museum","control.aero","convent.museum","coop","coop.br","coop.ht","coop.km","coop.mv","coop.mw",
    "coop.tt","copenhagen.museum","corporation.museum","correios-e-telecomunica??es.museum","corvette.museum","cosenza.it",
    "costume.museum","council.aero","countryestate.museum","county.museum","cpa.pro","cq.cn","cr","cr.it","crafts.museum",
    "cranbrook.museum","creation.museum","cremona.it","crew.aero","crimea.ua","crotone.it","cs.it","ct.it","ct.us","cu",
    "cultural.museum","culturalcenter.museum","culture.museum","cuneo.it","cv","cv.ua","cx","cyber.museum","cymru.museum",
    "cz","cz.it","czeladz.pl","czest.pl","d.bg","d.se","daegu.kr","daejeon.kr","dagestan.ru","dali.museum","dallas.museum",
    "database.museum","davvenjarga.no","davvenj?rga.no","davvesiida.no","dc.us","ddr.museum","de","de.com","de.us",
    "deatnu.no","decorativearts.museum","defense.tn","delaware.museum","delmenhorst.museum","denmark.museum","dep.no",
    "depot.museum","design.aero","design.museum","detroit.museum","dgca.aero","dielddanuorri.no","dinosaur.museum",
    "discovery.museum","divtasvuodna.no","divttasvuotna.no","dj","dk","dlugoleka.pl","dm","dn.ua","dnepropetrovsk.ua",
    "dni.us","dolls.museum","donetsk.ua","donna.no","d?nna.no","donostia.museum","dovre.no","dp.ua","dr.na","drammen.no",
    "drangedal.no","drobak.no","dr?bak.no","dudinka.ru","durham.museum","dyroy.no","dyr?y.no","dz","e.bg","e.se","e164.arpa",
    "eastafrica.museum","eastcoast.museum","ebiz.tw","e-burg.ru","ec","ecn.br","ed.ao","ed.ci","ed.cr","ed.jp","ed.pw",
    "edu","edu.ac","edu.af","edu.al","edu.an","edu.az","edu.ba","edu.bb","edu.bh","edu.bi","edu.bm","edu.bo","edu.br",
    "edu.bs","edu.bz","edu.ci","edu.cn","edu.co","edu.cu","edu.dm","edu.dz","edu.ec","edu.ee","edu.es","edu.ge","edu.gh",
    "edu.gi","edu.gn","edu.gp","edu.gr","edu.hk","edu.hn","edu.ht","edu.in","edu.iq","edu.is","edu.it","edu.jo","edu.kg",
    "edu.ki","edu.km","edu.kn","edu.ky","edu.kz","edu.la","edu.lb","edu.lc","edu.lk","edu.lr","edu.lv","edu.ly","edu.me",
    "edu.mg","edu.mk","edu.ml","edu.mn","edu.mo","edu.mv","edu.mw","edu.mx","edu.my","edu.ng","edu.nr","edu.pa","edu.pe",
    "edu.pf","edu.ph","edu.pk","edu.pl","edu.pn","edu.pr","edu.ps","edu.pt","edu.rs","edu.ru","edu.rw","edu.sa","edu.sb",
    "edu.sc","edu.sd","edu.sg","edu.sl","edu.sn","edu.st","edu.sy","edu.tj","edu.to","edu.tt","edu.tw","edu.ua","edu.vc",
    "edu.vn","edu.ws","education.museum","educational.museum","educator.aero","edunet.tn","ee","egersund.no",
    "egyptian.museum","eid.no","eidfjord.no","eidsberg.no","eidskog.no","eidsvoll.no","eigersund.no","eisenbahn.museum",
    "elblag.pl","elburg.museum","elk.pl","elvendrell.museum","elverum.no","embaixada.st","embroidery.museum","emergency.aero",
    "en.it","encyclopedic.museum","enebakk.no","eng.br","eng.pro","engerdal.no","engine.aero","engineer.aero","england.museum",
    "enna.it","ens.tn","entertainment.aero","entomology.museum","environment.museum","environmentalconservation.museum",
    "epilepsy.museum","equipment.aero","erotica.hu","erotika.hu","es","es.kr","esp.br","essex.museum","est.pr",
    "estate.museum","etc.br","ethnology.museum","eti.br","etne.no","etnedal.no","eu","eu.com","eu.int","evenassi.no",
    "even???i.no","evenes.no","evje-og-hornnes.no","exchange.aero","exeter.museum","exhibition.museum","experts-comptables.fr",
    "express.aero","f.bg","f.se","fam.pk","family.museum","far.br","fareast.ru","farm.museum","farmequipment.museum",
    "farmers.museum","farmstead.museum","farsund.no","fauske.no","fc.it","fe.it","fed.us","federation.aero","fedje.no",
    "fermo.it","ferrara.it","fet.no","fetsund.no","fg.it","fh.se","fhs.no","fhsk.se","fhv.se","fi","fi.cr","fi.it","fie.ee",
    "field.museum","figueres.museum","filatelia.museum","film.hu","film.museum","fin.ec","fin.tn","fineart.museum",
    "finearts.museum","finland.museum","finnoy.no","finn?y.no","firenze.it","firm.co","firm.ht","firm.in","firm.nf","firm.ro",
    "fitjar.no","fj.cn","fjaler.no","fjell.no","fl.us","fla.no","fl?.no","flakstad.no","flanders.museum","flatanger.no",
    "flekkefjord.no","flesberg.no","flight.aero","flog.br","flora.no","florence.it","florida.museum","floro.no","flor?.no",
    "fm","fm.br","fm.no","fnd.br","fo","foggia.it","folkebibl.no","folldal.no","force.museum","forde.no","f?rde.no",
    "forlicesena.it","forli-cesena.it","forsand.no","fortmissoula.museum","fortworth.museum","forum.hu","fosnes.no",
    "fot.br","foundation.museum","fr","fr.it","fr?na.no","frana.no","francaise.museum","frankfurt.museum","franziskaner.museum",
    "fredrikstad.no","freemasonry.museum","frei.no","freiburg.museum","freight.aero","fribourg.museum","frog.museum",
    "frogn.no","froland.no","from.hr","frosinone.it","frosta.no","froya.no","fr?ya.no","fst.br","fuel.aero","fundacio.museum",
    "fuoisku.no","fuossko.no","furniture.museum","fusa.no","fylkesbibl.no","fyresdal.no","g.bg","g.se","g12.br","ga",
    "ga.us","gaivuotna.no","g?ivuotna.no","gallery.museum","galsa.no","g?ls?.no","game.tw","games.hu","gamvik.no",
    "gangaviika.no","gangwon.kr","g??gaviika.no","garden.museum","gateway.museum","gaular.no","gausdal.no","gb.com",
    "gb.net","gc.ca","gd","gd.cn","gda.pl","gdansk.pl","gdynia.pl","ge","ge.it","geelvinck.museum","gemological.museum",
    "gen.in","genoa.it","genova.it","geology.museum","geometre-expert.fr","georgia.museum","gf","gg","ggf.br","gh","gi",
    "giehtavuoatna.no","giessen.museum","gildeskal.no","gildesk?l.no","giske.no","gjemnes.no","gjerdrum.no","gjerstad.no",
    "gjesdal.no","gjovik.no","gj?vik.no","gl","glas.museum","glass.museum","gliding.aero","gliwice.pl","glogow.pl",
    "gloppen.no","gm","gmina.pl","gniezno.pl","go.ci","go.cr","go.it","go.jp","go.kr","go.pw","go.th","go.tj","go.tz",
    "go.ug","gob.bo","gob.cl","gob.es","gob.hn","gob.mx","gob.pa","gob.pe","gob.pk","gok.pk","gol.no","gon.pk","gop.pk",
    "gorge.museum","gorizia.it","gorlice.pl","gos.pk","gouv.bj","gouv.ci","gouv.fr","gouv.ht","gouv.km","gouv.ml","gouv.rw",
    "gouv.sn","gov","gov.ac","gov.ae","gov.af","gov.al","gov.as","gov.az","gov.ba","gov.bb","gov.bf","gov.bh","gov.bm",
    "gov.bo","gov.br","gov.bs","gov.by","gov.bz","gov.cd","gov.cl","gov.cm","gov.cn","gov.co","gov.cu","gov.cx","gov.dm",
    "gov.dz","gov.ec","gov.ee","gov.ge","gov.gg","gov.gh","gov.gi","gov.gn","gov.gr","gov.hk","gov.ie","gov.im","gov.in",
    "gov.iq","gov.ir","gov.is","gov.it","gov.je","gov.jo","gov.kg","gov.ki","gov.km","gov.kn","gov.ky","gov.kz","gov.la",
    "gov.lb","gov.lc","gov.lk","gov.lr","gov.lt","gov.lv","gov.ly","gov.ma","gov.me","gov.mg","gov.mk","gov.ml","gov.mn",
    "gov.mo","gov.mr","gov.mu","gov.mv","gov.mw","gov.my","gov.nc.tr","gov.ng","gov.nr","gov.ph","gov.pk","gov.pl","gov.pn",
    "gov.pr","gov.ps","gov.pt","gov.rs","gov.ru","gov.rw","gov.sa","gov.sb","gov.sc","gov.sd","gov.sg","gov.sl","gov.st",
    "gov.sy","gov.tj","gov.tl","gov.tn","gov.to","gov.tt","gov.tw","gov.ua","gov.vc","gov.vn","gov.ws","government.aero",
    "gp","gq","gr","gr.it","gr.jp","grajewo.pl","gran.no","grandrapids.museum","grane.no","granvin.no","gratangen.no",
    "graz.museum","greta.fr","grimstad.no","grong.no","grosseto.it","groundhandling.aero","group.aero","grozny.ru","grp.lk",
    "grue.no","gs","gs.aa.no","gs.ah.no","gs.bu.no","gs.cn","gs.fm.no","gs.hl.no","gs.hm.no","gs.jan-mayen.no","gs.mr.no",
    "gs.nl.no","gs.nt.no","gs.of.no","gs.ol.no","gs.oslo.no","gs.rl.no","gs.sf.no","gs.st.no","gs.svalbard.no","gs.tm.no",
    "gs.tr.no","gs.va.no","gs.vf.no","gsm.pl","gu.us","guernsey.museum","gulen.no","guovdageaidnu.no","gv.ao","gv.at","gw",
    "gwangju.kr","gx.cn","gy","gyeongbuk.kr","gyeonggi.kr","gyeongnam.kr","gz.cn","h.bg","h.se","ha.cn","ha.no","h?.no",
    "habmer.no","h?bmer.no","hadsel.no","h?gebostad.no","hagebostad.no","halden.no","halloffame.museum","halsa.no",
    "hamar.no","hamaroy.no","hamburg.museum","hammarfeasta.no","h?mm?rfeasta.no","hammerfest.no","handson.museum",
    "hanggliding.aero","hapmir.no","h?pmir.no","haram.no","hareid.no","harstad.no","harvestcelebration.museum","hasvik.no",
    "hattfjelldal.no","haugesund.no","hawaii.museum","hb.cn","he.cn","health.museum","health.vn","heimatunduhren.museum",
    "hellas.museum","helsinki.museum","hembygdsforbund.museum","hemne.no","hemnes.no","hemsedal.no","herad.no",
    "heritage.museum","heroy.more-og-romsdal.no","her?y.m?re-og-romsdal.no","heroy.nordland.no","her?y.nordland.no","hi.cn",
    "hi.us","histoire.museum","historical.museum","historicalsociety.museum","historichouses.museum","historisch.museum",
    "historisches.museum","history.museum","historyofscience.museum","hitra.no","hjartdal.no","hjelmeland.no","hk","hk.cn",
    "hl.cn","hl.no","hm","hm.no","hn","hn.cn","hobol.no","hob?l.no","hof.no","hokksund.no","hol.no","hole.no","holmestrand.no",
    "holtalen.no","holt?len.no","homebuilt.aero","honefoss.no","h?nefoss.no","hornindal.no","horology.museum","horten.no",
    "hotel.hu","hotel.lk","house.museum","hoyanger.no","h?yanger.no","hoylandet.no","h?ylandet.no","hr","hs.kr","ht","hu",
    "hu.com","huissier-justice.fr","humanities.museum","hurdal.no","hurum.no","hvaler.no","hyllestad.no","i.bg","i.ph",
    "i.se","ia.us","ibestad.no","id.ir","id.lv","id.ly","id.us","idrett.no","idv.hk","idv.tw","ie","if.ua","iki.fi","il.us",
    "ilawa.pl","illustration.museum","im","im.it","imageandsound.museum","imb.br","imperia.it","in","in.na","in.rs","in.th",
    "in.ua","in.us","in-addr.arpa","incheon.kr","ind.br","ind.in","ind.tn","inderoy.no","inder?y.no","indian.museum",
    "indiana.museum","indianapolis.museum","indianmarket.museum","inf.br","inf.cu","inf.mk","info","info.at","info.az",
    "info.bb","info.co","info.ec","info.ht","info.hu","info.ki","info.la","info.mv","info.na","info.nf","info.nr","info.pk",
    "info.pl","info.pr","info.ro","info.sd","info.tn","info.tt","info.vn","ing.pa","ingatlan.hu","insurance.aero","int",
    "int.az","int.bo","int.ci","int.co","int.is","int.la","int.lk","int.mv","int.mw","int.pt","int.ru","int.rw","int.tj",
    "int.tt","int.vn","intelligence.museum","interactive.museum","intl.tn","io","ip6.arpa","iq","ir","iraq.museum","irc.pl",
    "iris.arpa","irkutsk.ru","iron.museum","is","is.it","isa.us","isernia.it","isla.pr","isleofman.museum","it","it.ao",
    "its.me","ivano-frankivsk.ua","ivanovo.ru","iveland.no","ivgu.no","iz.hr","izhevsk.ru","j.bg","jamal.ru","jamison.museum",
    "jan-mayen.no","jar.ru","jaworzno.pl","je","jefferson.museum","jeju.kr","jelenia-gora.pl","jeonbuk.kr","jeonnam.kr",
    "jerusalem.museum","jessheim.no","jevnaker.no","jewelry.museum","jewish.museum","jewishart.museum","jfk.museum",
    "jgora.pl","jl.cn","jo","jobs","jobs.tt","jogasz.hu","jolster.no","j?lster.no","jondal.no","jor.br","jorpeland.no",
    "j?rpeland.no","joshkar-ola.ru","journal.aero","journalism.museum","journalist.aero","jp","jpn.com","js.cn",
    "judaica.museum","judygarland.museum","juedisches.museum","juif.museum","jur.pro","jus.br","jx.cn","k.bg","k.se",
    "k12.ec","k12.vi","kafjord.no","k?fjord.no","kalisz.pl","kalmykia.ru","kaluga.ru","kamchatka.ru","karasjohka.no",
    "k?r??johka.no","karasjok.no","karate.museum","karelia.ru","karikatur.museum","karlsoy.no","karmoy.no","karm?y.no",
    "karpacz.pl","kartuzy.pl","kaszuby.pl","katowice.pl","kautokeino.no","kazan.ru","kazimierz-dolny.pl","kchr.ru",
    "kemerovo.ru","kepno.pl","ketrzyn.pl","kg","kg.kr","kh.ua","khabarovsk.ru","khakassia.ru","kharkov.ua","kherson.ua",
    "khmelnitskiy.ua","khv.ru","ki","kids.museum","kids.us","kiev.ua","kirkenes.no","kirov.ru","kirovograd.ua","klabu.no",
    "kl?bu.no","klepp.no","klodzko.pl","km","km.ua","kms.ru","kn","kobierzyce.pl","koebenhavn.museum","koeln.museum",
    "koenig.ru","kolobrzeg.pl","komforb.se","komi.ru","kommunalforbund.se","kommune.no","komvux.se","kongsberg.no",
    "kongsvinger.no","konin.pl","konskowola.pl","konyvelo.hu","kopervik.no","kostroma.ru","kr","kr.com","kr.it","kr.ua",
    "kraanghke.no","kr?anghke.no","kragero.no","krager?.no","krakow.pl","krasnoyarsk.ru","kristiansand.no","kristiansund.no",
    "krodsherad.no","kr?dsherad.no","krokstadelva.no","ks.ua","ks.us","kuban.ru","kunst.museum","kunstsammlung.museum",
    "kunstunddesign.museum","k-uralsk.ru","kurgan.ru","kursk.ru","kustanai.ru","kutno.pl","kuzbass.ru","kv.ua","kv?fjord.no",
    "kv?nangen.no","kvafjord.no","kvalsund.no","kvam.no","kvanangen.no","kvinesdal.no","kvinnherad.no","kviteseid.no",
    "kvitsoy.no","kvits?y.no","ky","ky.us","kz","l.bg","l.se","la","la.us","laakesvuemie.no","labor.museum","labour.museum",
    "l?rdal.no","lahppi.no","l?hppi.no","lajolla.museum","lakas.hu","lanbib.se","lancashire.museum","landes.museum",
    "langevag.no","langev?g.no","lans.museum","l?ns.museum","lapy.pl","laquila.it","lardal.no","larsson.museum","larvik.no",
    "laspezia.it","la-spezia.it","latina.it","lavagis.no","lavangen.no","law.pro","lc","lc.it","le.it","leangaviika.no",
    "lea?gaviika.no","leasing.aero","lebesby.no","lebork.pl","lecce.it","lecco.it","legnica.pl","leikanger.no","leirfjord.no",
    "leirvik.no","leka.no","leksvik.no","lel.br","lenvik.no","lerdal.no","lesja.no","levanger.no","lewismiller.museum",
    "lezajsk.pl","lg.jp","lg.ua","li","li.it","lib.ee","lier.no","lierne.no","lillehammer.no","lillesand.no","limanowa.pl",
    "lincoln.museum","lindas.no","lind?s.no","lindesnes.no","linz.museum","lipetsk.ru","living.museum","livinghistory.museum",
    "livorno.it","lk","ln.cn","lo.it","loabat.no","loab?t.no","local","localhistory.museum","lodi.it","lodingen.no",
    "l?dingen.no","logistics.aero","lom.no","lomza.pl","london.museum","loppa.no","lorenskog.no","l?renskog.no",
    "losangeles.museum","loten.no","l?ten.no","louvre.museum","lowicz.pl","loyalist.museum","ls","lt","lt.it","ltd.co.im",
    "ltd.gi","ltd.lk","lu","lu.it","lubin.pl","lucca.it","lucerne.museum","lugansk.ua","lukow.pl","lund.no","lunner.no",
    "luroy.no","lur?y.no","luster.no","lutsk.ua","luxembourg.museum","luzern.museum","lv","lviv.ua","ly","lyngdal.no",
    "lyngen.no","m.bg","m.se","ma","ma.us","macerata.it","mad.museum","madrid.museum","magadan.ru","magazine.aero",
    "magnitka.ru","mail.pl","maintenance.aero","malatvuopmi.no","m?latvuopmi.no","malbork.pl","mallorca.museum",
    "malopolska.pl","malselv.no","m?lselv.no","malvik.no","manchester.museum","mandal.no","mansion.museum","mansions.museum",
    "mantova.it","manx.museum","marburg.museum","mari.ru","mari-el.ru","marine.ru","maritime.museum","maritimo.museum",
    "marker.no","marketplace.aero","marnardal.no","maryland.museum","marylhurst.museum","masfjorden.no","masoy.no","m?s?y.no",
    "massacarrara.it","massa-carrara.it","mat.br","matera.it","matta-varjjat.no","m?tta-v?rjjat.no","mazowsze.pl","mazury.pl",
    "mb.ca","mbone.pl","mc","mc.it","md","md.ci","md.us","me","me.it","me.uk","me.us","med.br","med.ec","med.ee","med.ht",
    "med.ly","med.pa","med.pl","med.pro","med.sa","med.sd","medecin.fr","medecin.km","media.aero","media.hu","media.museum",
    "media.pl","medical.museum","medizinhistorisches.museum","meeres.museum","meland.no","meldal.no","melhus.no","meloy.no",
    "mel?y.no","memorial.museum","meraker.no","mer?ker.no","mesaverde.museum","messina.it","mg","mh","mi.it","mi.th","mi.us",
    "miasta.pl","michigan.museum","microlight.aero","midatlantic.museum","midsund.no","midtre-gauldal.no","mielec.pl",
    "mielno.pl","mil","mil.ac","mil.ae","mil.al","mil.az","mil.ba","mil.bo","mil.br","mil.by","mil.cn","mil.co","mil.ec",
    "mil.ge","mil.gh","mil.hn","mil.in","mil.iq","mil.jo","mil.kg","mil.km","mil.kr","mil.kz","mil.lv","mil.mg","mil.mv",
    "mil.my","mil.no","mil.pe","mil.ph","mil.pl","mil.ru","mil.rw","mil.st","mil.sy","mil.tj","mil.to","mil.tw","mil.vc",
    "milan.it","milano.it","military.museum","mill.museum","mincom.tn","miners.museum","mining.museum","minnesota.museum",
    "missile.museum","missoula.museum","mjondalen.no","mj?ndalen.no","mk","mk.ua","ml","mn","mn.it","mn.us","mo","mo.cn",
    "mo.it","mo.us","moareke.no","mo?reke.no","mobi","mobi.gp","mobi.na","mobi.tt","mod.gi","modalen.no","modelling.aero",
    "modena.it","modern.museum","modum.no","mo-i-rana.no","molde.no","moma.museum","money.museum","monmouth.museum",
    "monticello.museum","montreal.museum","monza.it","mordovia.ru","moscow.museum","mosjoen.no","mosj?en.no","moskenes.no",
    "mosreg.ru","moss.no","mosvik.no","motorcycle.museum","mp","mq","mr","mr.no","mragowo.pl","ms","ms.it","ms.kr","ms.us",
    "msk.ru","mt.it","mt.us","mu","muenchen.museum","muenster.museum","mulhouse.museum","muncie.museum","muosat.no",
    "muos?t.no","murmansk.ru","mus.br","museet.museum","museum","museum.mv","museum.mw","museum.no","museum.tt",
    "museumcenter.museum","museumvereniging.museum","music.museum","mv","mw","mx","mx.na","my","mytis.ru","n.bg","n.se",
    "na","na.it","naamesjevuemie.no","n??mesjevuemie.no","n?r?y.no","nakhodka.ru","naklo.pl","nalchik.ru","namdalseid.no",
    "name","name.az","name.hr","name.jo","name.mk","name.mv","name.my","name.na","name.pr","name.tj","name.tt","name.vn",
    "namsos.no","namsskogan.no","nannestad.no","naples.it","napoli.it","naroy.no","narviika.no","narvik.no","nat.tn",
    "national.museum","nationalfirearms.museum","nationalheritage.museum","nativeamerican.museum","naturalhistory.museum",
    "naturalhistorymuseum.museum","naturalsciences.museum","naturbruksgymn.se","nature.museum","naturhistorisches.museum",
    "natuurwetenschappen.museum","naumburg.museum","naustdal.no","naval.museum","navigation.aero","navuotna.no","n?vuotna.no",
    "nb.ca","nc","nc.us","nd.us","ne","ne.jp","ne.kr","ne.pw","ne.tz","ne.ug","ne.us","nebraska.museum","nedre-eiker.no",
    "nes.akershus.no","nes.buskerud.no","nesna.no","nesodden.no","nesoddtangen.no","nesseby.no","nesset.no","net","net.ac",
    "net.ae","net.af","net.ag","net.ai","net.al","net.an","net.az","net.ba","net.bb","net.bh","net.bm","net.bo","net.br",
    "net.bs","net.bz","net.ci","net.cn","net.co","net.cu","net.dm","net.dz","net.ec","net.ge","net.gg","net.gn","net.gp",
    "net.gr","net.gy","net.hk","net.hn","net.ht","net.im","net.in","net.iq","net.ir","net.is","net.je","net.jo","net.kg",
    "net.ki","net.kn","net.ky","net.kz","net.la","net.lb","net.lc","net.lk","net.lr","net.lv","net.ly","net.ma","net.me",
    "net.mk","net.ml","net.mo","net.mu","net.mv","net.mw","net.mx","net.my","net.nf","net.ng","net.nr","net.nz","net.pa",
    "net.pe","net.ph","net.pk","net.pl","net.pn","net.pr","net.ps","net.pt","net.ru","net.rw","net.sa","net.sb","net.sc",
    "net.sd","net.sg","net.sl","net.st","net.sy","net.th","net.tj","net.tn","net.to","net.tt","net.tw","net.ua","net.vc",
    "net.vi","net.vn","net.ws","neues.museum","newhampshire.museum","newjersey.museum","newmexico.museum","newport.museum",
    "news.hu","newspaper.museum","newyork.museum","nf","nf.ca","ngo.lk","ngo.ph","ngo.pl","nh.us","nic.im","nic.in","nic.tj",
    "niepce.museum","nieruchomosci.pl","nikolaev.ua","nissedal.no","nittedal.no","nj.us","nkz.ru","nl","nl.ca","nl.no","nm.cn",
    "nm.us","nnov.ru","no","no.com","no.it","nom.ad","nom.ag","nom.br","nom.co","nom.es","nom.fr","nom.km","nom.mg","nom.pa",
    "nom.pe","nom.pl","nom.re","nom.ro","nome.pt","nord-aurdal.no","norddal.no","nord-fron.no","nordkapp.no","nord-odal.no",
    "nordreisa.no","nordre-land.no","nore-og-uvdal.no","norfolk.museum","norilsk.ru","north.museum","not.br","notaires.fr",
    "notaires.km","notodden.no","notteroy.no","n?tter?y.no","nov.ru","novara.it","novosibirsk.ru","nowaruda.pl","nr","nrw.museum",
    "ns.ca","nsk.ru","nsn.us","nsw.au","nsw.edu.au","nt.au","nt.ca","nt.edu.au","nt.gov.au","nt.no","nt.ro","ntr.br","nu",
    "nu.ca","nu.it","nuernberg.museum","nuoro.it","nuremberg.museum","nv.us","nx.cn","ny.us","nyc.museum","nyny.museum",
    "nysa.pl","o.bg","o.se","oceanographic.museum","oceanographique.museum","od.ua","odda.no","odessa.ua","odo.br","of.by",
    "of.no","off.ai","og.ao","oh.us","ok.us","oksnes.no","?ksnes.no","ol.no","olawa.pl","olecko.pl","olkusz.pl","olsztyn.pl",
    "omaha.museum","omasvuotna.no","omsk.ru","on.ca","online.museum","ontario.museum","openair.museum","operaunite.com",
    "opoczno.pl","opole.pl","oppdal.no","oppegard.no","oppeg?rd.no","or.at","or.bi","or.ci","or.cr","or.it","or.jp","or.kr",
    "or.mu","or.na","or.pw","or.th","or.tz","or.ug","or.us","oregon.museum","oregontrail.museum","orenburg.ru","org","org.ac",
    "org.ae","org.af","org.ag","org.ai","org.al","org.an","org.au","org.az","org.ba","org.bb","org.bh","org.bi","org.bm",
    "org.bo","org.br","org.bs","org.bw","org.bz","org.ci","org.cn","org.co","org.cu","org.dm","org.dz","org.ec","org.ee",
    "org.es","org.ge","org.gg","org.gh","org.gi","org.gn","org.gp","org.gr","org.hk","org.hn","org.ht","org.hu","org.im",
    "org.in","org.iq","org.ir","org.is","org.je","org.jo","org.kg","org.ki","org.km","org.kn","org.ky","org.kz","org.la",
    "org.lb","org.lc","org.lk","org.lr","org.ls","org.lv","org.ly","org.ma","org.me","org.mg","org.mk","org.ml","org.mn",
    "org.mo","org.mu","org.mv","org.mw","org.mx","org.my","org.na","org.ng","org.nr","org.pa","org.pe","org.pf","org.ph",
    "org.pk","org.pl","org.pn","org.pr","org.ps","org.pt","org.ro","org.rs","org.ru","org.sa","org.sb","org.sc","org.sd",
    "org.se","org.sg","org.sl","org.sn","org.st","org.sy","org.sz","org.tj","org.tn","org.to","org.tt","org.tw","org.ua",
    "org.uk","org.vc","org.vi","org.vn","org.ws","oristano.it","orkanger.no","orkdal.no","orland.no","?rland.no","orskog.no",
    "?rskog.no","orsta.no","?rsta.no","oryol.ru","os.hedmark.no","os.hordaland.no","osen.no","oskol.ru","oslo.no","osoyro.no",
    "os?yro.no","osteroy.no","oster?y.no","ostre-toten.no","?stre-toten.no","ostroda.pl","ostroleka.pl","ostrowiec.pl",
    "ostrowwlkp.pl","otago.museum","other.nf","overhalla.no","ovre-eiker.no","?vre-eiker.no","oxford.museum","oyer.no",
    "?yer.no","oygarden.no","?ygarden.no","oystre-slidre.no","?ystre-slidre.no","p.bg","p.se","pa","pa.gov.pl","pa.it",
    "pa.us","pacific.museum","paderborn.museum","padova.it","padua.it","palace.museum","palana.ru","paleo.museum",
    "palermo.it","palmsprings.museum","panama.museum","parachuting.aero","paragliding.aero","paris.museum","parma.it",
    "parti.se","pasadena.museum","passenger-association.aero","pavia.it","pb.ao","pc.it","pc.pl","pd.it","pe","pe.ca",
    "pe.it","pe.kr","penza.ru","per.la","per.nf","per.sg","perm.ru","perso.ht","perso.sn","perso.tn","perugia.it",
    "pesarourbino.it","pesaro-urbino.it","pescara.it","pf","pg.it","ph","pharmacien.fr","pharmaciens.km","pharmacy.museum",
    "philadelphia.museum","philadelphiaarea.museum","philately.museum","phoenix.museum","photography.museum","pi.it",
    "piacenza.it","pila.pl","pilot.aero","pilots.museum","pisa.it","pistoia.it","pisz.pl","pittsburgh.museum","pk","pl",
    "pl.ua","planetarium.museum","plantation.museum","plants.museum","plaza.museum","plc.co.im","plc.ly","plo.ps","pn",
    "pn.it","po.gov.pl","po.it","podhale.pl","podlasie.pl","pol.dz","pol.ht","polkowice.pl","poltava.ua","pomorskie.pl",
    "pomorze.pl","pordenone.it","porsanger.no","porsangu.no","pors??gu.no","porsgrunn.no","port.fr","portal.museum",
    "portland.museum","portlligat.museum","posts-and-telecommunications.museum","potenza.it","powiat.pl","poznan.pl",
    "pp.az","pp.ru","pp.se","ppg.br","pr","pr.it","pr.us","prato.it","prd.fr","prd.km","prd.mg","preservation.museum",
    "presidio.museum","press.aero","press.ma","press.museum","press.se","presse.ci","presse.fr","presse.km","presse.ml",
    "pri.ee","principe.st","priv.at","priv.hu","priv.me","priv.no","priv.pl","pro","pro.az","pro.br","pro.ec","pro.ht",
    "pro.mv","pro.na","pro.pr","pro.tt","pro.vn","prochowice.pl","production.aero","prof.pr","project.museum","pruszkow.pl",
    "przeworsk.pl","ps","psc.br","psi.br","pskov.ru","pt","pt.it","ptz.ru","pu.it","pub.sa","publ.pt","public.museum",
    "pubol.museum","pulawy.pl","pv.it","pvt.ge","pw","pyatigorsk.ru","pz.it","q.bg","qc.ca","qc.com","qh.cn","qld.au",
    "qld.edu.au","qld.gov.au","qsl.br","quebec.museum","r.bg","r.se","ra.it","rade.no","r?de.no","radom.pl","radoy.no",
    "rad?y.no","r?lingen.no","ragusa.it","rahkkeravju.no","r?hkker?vju.no","raholt.no","r?holt.no","railroad.museum",
    "railway.museum","raisa.no","r?isa.no","rakkestad.no","ralingen.no","rana.no","randaberg.no","rauma.no","ravenna.it",
    "rawa-maz.pl","rc.it","re","re.it","re.kr","realestate.pl","rec.br","rec.co","rec.nf","rec.ro","recreation.aero",
    "reggiocalabria.it","reggio-calabria.it","reggioemilia.it","reggio-emilia.it","reklam.hu","rel.ht","rel.pl","rendalen.no",
    "rennebu.no","rennesoy.no","rennes?y.no","repbody.aero","res.aero","res.in","research.aero","research.museum",
    "resistance.museum","rg.it","ri.it","ri.us","rieti.it","riik.ee","rimini.it","rindal.no","ringebu.no","ringerike.no",
    "ringsaker.no","riodejaneiro.museum","risor.no","ris?r.no","rissa.no","rl.no","rm.it","rn.it","rnd.ru","rnrt.tn","rns.tn",
    "rnu.tn","ro","ro.it","roan.no","rochester.museum","rockart.museum","rodoy.no","r?d?y.no","rollag.no","roma.it",
    "roma.museum","rome.it","romsa.no","romskog.no","r?mskog.no","roros.no","r?ros.no","rost.no","r?st.no","rotorcraft.aero",
    "rovigo.it","rovno.ua","royken.no","r?yken.no","royrvik.no","r?yrvik.no","rs","rs.ba","ru","ru.com","rubtsovsk.ru",
    "ruovat.no","russia.museum","rv.ua","rw","ryazan.ru","rybnik.pl","rygge.no","rzeszow.pl","s.bg","s.se","sa","sa.au",
    "sa.com","sa.cr","sa.edu.au","sa.gov.au","sa.it","safety.aero","saintlouis.museum","sakhalin.ru","salangen.no","salat.no",
    "s?lat.no","s?l?t.no","salem.museum","salerno.it","saltdal.no","salvadordali.museum","salzburg.museum","samara.ru",
    "samnanger.no","sande.more-og-romsdal.no","sande.m?re-og-romsdal.no","sande.vestfold.no","sandefjord.no","sandiego.museum",
    "sandnes.no","sandnessjoen.no","sandnessj?en.no","sandoy.no","sand?y.no","sanfrancisco.museum","sanok.pl",
    "santabarbara.museum","santacruz.museum","santafe.museum","saotome.st","saratov.ru","sarpsborg.no","saskatchewan.museum",
    "sassari.it","satx.museum","sauda.no","sauherad.no","savannahga.museum","savona.it","sb","sc","sc.cn","sc.kr","sc.ug",
    "sc.us","sch.ae","sch.gg","sch.ir","sch.je","sch.jo","sch.lk","sch.ly","sch.sa","sch.uk","schlesisches.museum",
    "schoenbrunn.museum","schokoladen.museum","school.museum","school.na","schweiz.museum","science.museum",
    "scienceandhistory.museum","scienceandindustry.museum","sciencecenter.museum","sciencecenters.museum","science-fiction.museum",
    "sciencehistory.museum","sciences.museum","sciencesnaturelles.museum","scientist.aero","scotland.museum","sd","sd.cn",
    "sd.us","se","se.com","se.net","seaport.museum","sebastopol.ua","sec.ps","sejny.pl","sel.no","selbu.no","selje.no",
    "seljord.no","seoul.kr","services.aero","settlement.museum","settlers.museum","sex.hu","sex.pl","sf.no","sg","sh",
    "sh.cn","shell.museum","sherbrooke.museum","shop.ht","shop.hu","shop.pl","show.aero","si","si.it","sibenik.museum",
    "siedlce.pl","siellak.no","siena.it","sigdal.no","siljan.no","silk.museum","simbirsk.ru","siracusa.it","sirdal.no",
    "sk","sk.ca","skanit.no","sk?nit.no","skanland.no","sk?nland.no","skaun.no","skedsmo.no","skedsmokorset.no",
    "ski.museum","ski.no","skien.no","skierva.no","skierv?.no","skiptvet.no","skjak.no","skj?k.no","skjervoy.no",
    "skjerv?y.no","sklep.pl","skoczow.pl","skodje.no","skole.museum","skydiving.aero","sl","slask.pl","slattum.no",
    "sld.pa","slg.br","slupsk.pl","sm","smola.no","sm?la.no","smolensk.ru","sn","sn.cn","snaase.no","sn?ase.no","snasa.no",
    "sn?sa.no","snillfjord.no","snoasa.no","snz.ru","so.gov.pl","so.it","soc.lk","society.museum","software.aero",
    "sogndal.no","sogne.no","s?gne.no","sokndal.no","sola.no","sologne.museum","solund.no","somna.no","s?mna.no",
    "sondre-land.no","s?ndre-land.no","sondrio.it","songdalen.no","sopot.pl","sor-aurdal.no","s?r-aurdal.no","sorfold.no",
    "s?rfold.no","sor-fron.no","s?r-fron.no","sor-odal.no","s?r-odal.no","sorreisa.no","s?rreisa.no","sortland.no",
    "sorum.no","s?rum.no","sor-varanger.no","s?r-varanger.no","sos.pl","sosnowiec.pl","soundandvision.museum",
    "southcarolina.museum","southwest.museum","sp.it","space.museum","spb.ru","spjelkavik.no","sport.hu","spy.museum",
    "spydeberg.no","square.museum","sr","sr.gov.pl","sr.it","srv.br","ss.it","sshn.se","st","st.no","stadt.museum",
    "stalbans.museum","stalowa-wola.pl","stange.no","starachowice.pl","stargard.pl","starnberg.museum","starostwo.gov.pl",
    "stat.no","state.museum","stateofdelaware.museum","stathelle.no","station.museum","stavanger.no","stavern.no",
    "stavropol.ru","steam.museum","steiermark.museum","steigen.no","steinkjer.no","stjohn.museum","stjordal.no","stj?rdal.no",
    "stjordalshalsen.no","stj?rdalshalsen.no","stockholm.museum","stokke.no","stord.no","stordal.no","store.bb","store.nf",
    "store.ro","store.st","stor-elvdal.no","storfjord.no","stpetersburg.museum","strand.no","stranda.no","stryn.no",
    "student.aero","stuttgart.museum","stv.ru","su","suedtirol.it","suisse.museum","sula.no","suldal.no","suli.hu","sumy.ua",
    "sund.no","sunndal.no","surgeonshall.museum","surgut.ru","surnadal.no","surrey.museum","suwalki.pl","sv.it","svalbard.no",
    "sveio.no","svelvik.no","svizzera.museum","sweden.museum","swidnica.pl","swiebodzin.pl","swinoujscie.pl","sx.cn","sy",
    "sydney.museum","sykkylven.no","syzran.ru","sz","szczecin.pl","szczytno.pl","szex.hu","szkola.pl","t.bg","t.se","ta.it",
    "tambov.ru","tana.no","tananger.no","tank.museum","taranto.it","targi.pl","tarnobrzeg.pl","tas.au","tas.edu.au",
    "tas.gov.au","tatarstan.ru","taxi.aero","tc","tcm.museum","td","te.it","te.ua","technology.museum","tel",
    "telekommunikation.museum","television.museum","teramo.it","terni.it","ternopil.ua","test.ru","test.tj","texas.museum",
    "textile.museum","tf","tg","tgory.pl","th","theater.museum","time.museum","time.no","timekeeping.museum","tingvoll.no",
    "tinn.no","tj","tj.cn","tjeldsund.no","tjome.no","tj?me.no","tk","tl","tm","tm.fr","tm.hu","tm.km","tm.mc","tm.mg",
    "tm.no","tm.pl","tm.ro","tm.se","tmp.br","tn","tn.it","tn.us","to","to.it","tokke.no","tolga.no","tom.ru","tomsk.ru",
    "tonsberg.no","t?nsberg.no","topology.museum","torino.it","torino.museum","torsken.no","touch.museum","tourism.pl",
    "tourism.tn","town.museum","tozsde.hu","tp.it","tr","tr.it","tr.no","trader.aero","trading.aero","tr?na.no","trainer.aero",
    "trana.no","tranby.no","tranoy.no","tran?y.no","transport.museum","trapani.it","travel","travel.pl","travel.tt","trd.br",
    "tree.museum","trentino.it","trento.it","treviso.it","trieste.it","troandin.no","trogstad.no","tr?gstad.no","trolley.museum",
    "tromsa.no","tromso.no","troms?.no","trondheim.no","trust.museum","trustee.museum","trysil.no","ts.it","tsaritsyn.ru",
    "tsk.ru","tt","tula.ru","tur.br","turek.pl","turen.tn","turin.it","turystyka.pl","tuva.ru","tv","tv.bo","tv.br","tv.it",
    "tv.na","tvedestrand.no","tver.ru","tw","tw.cn","tx.us","tychy.pl","tydal.no","tynset.no","tysfjord.no","tysnes.no",
    "tysv?r.no","tysvar.no","tyumen.ru","u.bg","u.se","ua","ud.it","udine.it","udm.ru","udmurtia.ru","ug","ug.gov.pl",
    "uhren.museum","uk.com","uk.net","ulan-ude.ru","ullensaker.no","ullensvang.no","ulm.museum","ulsan.kr","ulvik.no",
    "um.gov.pl","unbi.ba","undersea.museum","union.aero","univ.sn","university.museum","unjarga.no","unj?rga.no","unsa.ba",
    "upow.gov.pl","uri.arpa","urn.arpa","us","us.com","us.na","usa.museum","usantiques.museum","usarts.museum",
    "uscountryestate.museum","usculture.museum","usdecorativearts.museum","usenet.pl","usgarden.museum","ushistory.museum",
    "ushuaia.museum","uslivinghistory.museum","ustka.pl","ut.us","utah.museum","utazas.hu","utsira.no","uvic.museum",
    "uw.gov.pl","uy.com","uz","uzhgorod.ua","v.bg","va","va.it","va.no","va.us","vaapste.no","vadso.no","vads?.no","v?r?y.no",
    "vaga.no","v?g?.no","vagan.no","v?gan.no","vagsoy.no","v?gs?y.no","vaksdal.no","valer.hedmark.no","v?ler.hedmark.no",
    "valer.ostfold.no","v?ler.?stfold.no","valle.no","valley.museum","vang.no","vantaa.museum","vanylven.no","vardo.no",
    "vard?.no","varese.it","varggat.no","v?rgg?t.no","varoy.no","vb.it","vc","vc.it","vdonsk.ru","ve.it","vefsn.no","vega.no",
    "vegarshei.no","veg?rshei.no","venezia.it","venice.it","vennesla.no","verbania.it","vercelli.it","verdal.no","verona.it",
    "verran.no","versailles.museum","vestby.no","vestnes.no","vestre-slidre.no","vestre-toten.no","vestvagoy.no","vestv?g?y.no",
    "vet.br","veterinaire.fr","veterinaire.km","vevelstad.no","vf.no","vg","vgs.no","vi","vi.it","vi.us","vibovalentia.it",
    "vibo-valentia.it","vic.au","vic.edu.au","vic.gov.au","vicenza.it","video.hu","vik.no","viking.museum","vikna.no",
    "village.museum","vindafjord.no","vinnica.ua","virginia.museum","virtual.museum","virtuel.museum","viterbo.it",
    "vlaanderen.museum","vladikavkaz.ru","vladimir.ru","vladivostok.ru","vlog.br","vn","vn.ua","voagat.no","volda.no",
    "volgograd.ru","volkenkunde.museum","vologda.ru","voronezh.ru","voss.no","vossevangen.no","vr.it","vrn.ru","vt.it",
    "vt.us","vu","vv.it","vyatka.ru","w.bg","w.se","wa.au","wa.edu.au","wa.gov.au","wa.us","walbrzych.pl","wales.museum",
    "wallonie.museum","war.museum","warmia.pl","warszawa.pl","washingtondc.museum","watchandclock.museum",
    "watch-and-clock.museum","waw.pl","web.co","web.lk","web.nf","web.pk","web.tj","wegrow.pl","western.museum",
    "westfalen.museum","whaling.museum","wi.us","wielun.pl","wiki.br","wildlife.museum","williamsburg.museum","windmill.museum",
    "wlocl.pl","wloclawek.pl","wodzislaw.pl","wolomin.pl","workinggroup.aero","works.aero","workshop.museum","wroc.pl",
    "wroclaw.pl","ws","ws.na","wv.us","www.ro","wy.us","x.bg","x.se","xj.cn","xxx","xz.cn","y.bg","y.se","yakutia.ru",
    "yamal.ru","yaroslavl.ru","yekaterinburg.ru","yk.ca","yn.cn","york.museum","yorkshire.museum","yosemite.museum",
    "youth.museum","yuzhno-sakhalinsk.ru","z.bg","z.se","za.com","za.net","za.org","zachpomor.pl","zagan.pl","zakopane.pl",
    "zaporizhzhe.ua","zarow.pl","zgora.pl","zgorzelec.pl","zgrad.ru","zhitomir.ua","zj.cn","zlg.br","zoological.museum",
    "zoology.museum","zp.ua","zt.ua","????.museum","???????.museum","?????.ir","?????.ir","??.hk","??.hk","??.cn",
    "??.hk","??.tw","??.hk","??.hk","??.hk","??.hk","??.hk","??.tw","??.hk ","??.cn","??.hk","??.hk",
    "??.tw","??.hk","??.hk","??.hk","??.cn","??.hk"
];