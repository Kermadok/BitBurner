/** @param {NS} ns */
export async function main(ns) {
	//paramètres

	let ratio_hack = 0.5 //ratio à hack sur serveur (1=rien)
	let nb_top = 10 //nombre de serveurs dans le top

	// Initialiser les variables
	let serveur = null;
	let maxMoney = 0;

	// Initialiser un tableau vide pour stocker les serveurs les plus rentables


	//recherche des serveurs visibles
	function spider() {
		let serversSeen = ['home']

		for (let i = 0; i < serversSeen.length; i++) {
			let thisScan = ns.scan(serversSeen[i]);
			for (let j = 0; j < thisScan.length; j++) {
				if (!serversSeen.includes(thisScan[j])) {
					serversSeen.push(thisScan[j]);
				}
			}
		}

		return serversSeen;
	}

	//calcul du nombre de threads
	function ThreatCalc(path, script) {
		let ramscript = ns.getScriptRam(script);
		let rammax = ns.getServerMaxRam(path);
		let usedram = ns.getServerUsedRam(path);
		let threadsmax = Math.floor((rammax - usedram) / ramscript);
		return threadsmax;
	}

	//Fonction Weaken
	async function runweaken(serveur) {
		let securityThresh = ns.getServerMinSecurityLevel(serveur) + 5;
		if (ns.isRunning("weaken.js", "home", serveur) || ns.isRunning("grow.js", "home", serveur) || ns.isRunning("hack.js", "home", serveur)) {
			//ns.tprint("skip weaken")
		}
		else {
			//déclaration des variables cibles weaken

			// If the server's security level is above our threshold, weaken it
			if (ns.getServerSecurityLevel(serveur) > securityThresh) {
				//calcul du weak par thread
				let ramscript = ns.getScriptRam("weaken.js");
				let rammax = ns.getServerMaxRam("home");
				let usedram = ns.getServerUsedRam("home");
				let threadsmax = Math.floor((rammax - usedram) / ramscript);
				//variable de la securité a descendre
				let sec2kill = ns.getServerSecurityLevel(serveur) - ns.getServerMinSecurityLevel(serveur);
				//nombre de threads nécessaires pour le weaken
				let nb_threads = Math.ceil(sec2kill / 0.05);
				if (nb_threads > threadsmax && threadsmax >= 1) {
					nb_threads = threadsmax;
				}
				//ns.tprint("weaken lancé: ", ns.getServerSecurityLevel(serveur), "(min: ", ns.getServerMinSecurityLevel(serveur), ")");
				ns.exec("weaken.js", "home", nb_threads + 1, serveur);
			}
		}
	}

	//Fonction Grow
	async function rungrow(serveur) {
		const moneyThresh = ns.getServerMaxMoney(serveur) * 0.9;
		if (ns.isRunning("weaken.js", "home", serveur) || ns.isRunning("grow.js", "home", serveur) || ns.isRunning("hack.js", "home", serveur)) {

		}
		else {

			if (ns.getServerMoneyAvailable(serveur) < moneyThresh) {
				let ramscript = ns.getScriptRam("grow.js");
				let rammax = ns.getServerMaxRam("home");
				let usedram = ns.getServerUsedRam("home");
				let threadsmax = (rammax - usedram) / ramscript;
				//ns.tprint("threadsmax :", threadsmax);
				//ns.tprint("rammax :", rammax);
				//ns.tprint("usedram :", usedram);
				//nombre de growth necessaire pour cap
				let grow_ratio = ns.getServerMaxMoney(serveur) / ns.getServerMoneyAvailable(serveur);

				let nb_grow = ns.growthAnalyze(serveur, grow_ratio);


				if (nb_grow > threadsmax && threadsmax >= 1) {
					nb_grow = threadsmax;
				}

				ns.run("grow.js", Math.floor(nb_grow) + 1, serveur);
			}

		}
	}

	//Fonction Hack
	async function runhack(serveur) {
		if (ns.isRunning("weaken.js", "home", serveur) || ns.isRunning("grow.js", "home", serveur) || ns.isRunning("hack.js", "home", serveur) || ns.getServerMoneyAvailable(serveur) < (ns.getServerMaxMoney(serveur) * 0.9)) {
			//ns.tprint("skip hack.js")
		}
		else {
			// Defines the maximum security level the target server can
			// have.
			const securityThresh = ns.getServerMinSecurityLevel(serveur) + 5;
			let yieldParThread = ns.getServerMoneyAvailable(serveur) * ns.hackAnalyze(serveur)
			//détermination du montant cible (50%)
			let targetyield = ns.getServerMoneyAvailable(serveur) - (ns.getServerMaxMoney(serveur) * ratio_hack);

			//nombre de thread dispo max
			let ramscript = ns.getScriptRam("hack.js");
			let rammax = ns.getServerMaxRam("home");
			let usedram = ns.getServerUsedRam("home");
			let threadsmax = Math.floor((rammax - usedram) / ramscript);

			//nombre de threads nécessaires pour le targetyield
			let nb_threads = Math.ceil(targetyield / yieldParThread);

			//lancement du hack
			if (nb_threads > threadsmax) {
				nb_threads = threadsmax;
			}

			ns.exec("hack.js", "home", nb_threads + 1, serveur);
		}
	}

	//Boucle de hack
	while (true) {
		let liste_serveurs = spider();
		let topServers = [];
		// Classement rentabilité top x
		for (let server of liste_serveurs) {

			// Ignorer le serveur si son niveau de sécurité est supérieur à votre niveau de piratage actuel
			if ((ns.getServerRequiredHackingLevel(server) * 1.5) > ns.getHackingLevel(server) + 1) {
				continue;
			}

			//ignorer si les crack sont pas dispo
			if (ns.getServerNumPortsRequired(server) >= 2 && ns.fileExists("FTPCrack.exe", "home") === false) {
				continue;
			}

			// Calculer la quantité d'argent que vous pouvez gagner en piratant ce serveur
			let money = ns.getServerMaxMoney(server);

			// Vérifier si le tableau des serveurs les plus rentables est inférieur à 5 éléments ou si le serveur actuel a plus d'argent que le serveur avec le moins d'argent parmi les 5 premiers
			if (topServers.length < nb_top || money > topServers[nb_top - 1].money) {
				// Si le tableau est déjà plein, supprimer le dernier élément (le serveur avec le moins d'argent)
				if (topServers.length === nb_top) {
					topServers.pop();
				}
				// Ajouter le serveur actuel au tableau des serveurs les plus rentables
				topServers.push({ server: server, money: money });
				// Trier le tableau en ordre décroissant de l'argent disponible
				topServers.sort((a, b) => b.money - a.money);
			}
		}
		ns.print("tout ", liste_serveurs)
		ns.print("top10: ", topServers)
		for (let serveurInfo of topServers) {
			let serveur = serveurInfo.server;
			// Pirater le serveur le plus rentable
			if (serveur != null) {

				//compromission du serveur
				if (ns.hasRootAccess(serveur) === false) {
					if (ns.fileExists("BruteSSH.exe", "home")) {
						ns.brutessh(serveur);
					}
					if (ns.fileExists("FTPCrack.exe", "home")) {
						ns.ftpcrack(serveur);
					}
					if (ns.fileExists("relaySMTP.exe", "home")) {
						ns.relaysmtp(serveur);
					}
					if (ns.fileExists("HTTPWorm.exe", "home")) {
						ns.httpworm(serveur);
					}
					if (ns.fileExists("SQLInject.exe", "home")) {
						ns.sqlinject(serveur);
					}
					ns.nuke(serveur);
				}
				runweaken(serveur);
				rungrow(serveur);
				runhack(serveur);
			}
		}
		await ns.sleep(1000)
	}
}