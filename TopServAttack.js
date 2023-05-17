/** @param {NS} ns */
export async function main(ns) {

      //recherche des serveurs visibles
    function spider() {
      let serversSeen = ['home']
  
      for (let i = 0; i < serversSeen.length; i++) {
        let thisScan = ns.scan(serversSeen[i]);
        for (let j = 0; j < thisScan.length; j++) {
          if (serversSeen.indexOf(thisScan[j]) === -1) {
            serversSeen.push(thisScan[j]);
        }
        }
      }
  
      return serversSeen;
    }
  
  
    // Initialiser les variables
    let bestServer = null;
    let maxMoney = 0;
    let liste_serveurs = spider();
  
  
  // Initialiser un tableau vide pour stocker les serveurs les plus rentables
  let topServers = [];
  
  // Boucle à travers tous les serveurs
  for (let server of liste_serveurs) {
  
    // Ignorer le serveur si son niveau de sécurité est supérieur à votre niveau de piratage actuel
    if ((ns.getServerRequiredHackingLevel(server) * 1.5) > ns.getHackingLevel(server) + 1) {
      continue;
    }
  
    // Calculer la quantité d'argent que vous pouvez gagner en piratant ce serveur
    let money = ns.getServerMaxMoney(server);
  
    // Vérifier si le tableau des serveurs les plus rentables est inférieur à 5 éléments ou si le serveur actuel a plus d'argent que le serveur avec le moins d'argent parmi les 5 premiers
    if (topServers.length < 5 || money > topServers[4].money) {
      // Si le tableau est déjà plein, supprimer le dernier élément (le serveur avec le moins d'argent)
      if (topServers.length === 5) {
        topServers.pop();
      }
      // Ajouter le serveur actuel au tableau des serveurs les plus rentables
      topServers.push({ server: server, money: money });
      // Trier le tableau en ordre décroissant de l'argent disponible
      topServers.sort((a, b) => b.money - a.money);
    }
  }
  
  
  
  
      // Pirater le serveur le plus rentable
      if (bestServer != null) {
        //ns.tprint(`Le serveur le plus rentable est ${bestServer}, avec un potentiel de gain de ${maxMoney / 1000000}m`);
  
        //compromission du meilleur serveur
        ns.brutessh(bestServer);
        if (ns.fileExists("FTPCrack.exe", "home")) {
          ns.ftpcrack(bestServer);
        }
  
        ns.nuke(bestServer);
      }
      //Début Weaken
      let securityThresh = ns.getServerMinSecurityLevel(bestServer) + 5;
      if (ns.scriptRunning("weaken.js", "home")) {
        ns.print("skip weaken")
      }
      else {
        //déclaration des variables cibles weaken
        
        // If the server's security level is above our threshold, weaken it
        if (ns.getServerSecurityLevel(bestServer) > securityThresh) {
  
          //calcul du weak par thread
  
  
          let ramscript = ns.getScriptRam("weaken.js");
          ns.tprint("variable ramscript pour weaken ", ramscript);
          let rammax = ns.getServerMaxRam("home");
          ns.tprint("variable rammax pour weaken ", rammax);
          let usedram = ns.getServerUsedRam("home");
          let threadsmax = (rammax / ramscript) - usedram;
          ns.tprint("variable threadsmax pour weaken ", threadsmax)
          //variable de la securité a descendre
          let sec2kill = ns.getServerSecurityLevel(bestServer) - ns.getServerMinSecurityLevel(bestServer) + 5;
          ns.tprint("variable sec2kill pour weaken ", sec2kill);
          //nombre de threads nécessaires pour le weaken
          let nb_threads = sec2kill / 0.05;
          ns.tprint("variable nbthreads pour weaken ", nb_threads);
          if (nb_threads > threadsmax) {
            nb_threads = threadsmax;
          }
  
          ns.exec("weaken.js", "home", Math.floor(nb_threads), bestServer);
        }
      }
  
  
      //Début Grow
  
      if (ns.isRunning("grow.js", "home")) {
        ns.print("skip grow")
      }
      else {
        //ns.print("Money available: ", ns.getServerMoneyAvailable(bestServer))
        const moneyThresh = ns.getServerMaxMoney(bestServer) * 0.9;
        if (ns.getServerMoneyAvailable(bestServer) < moneyThresh) {
          let ramscript = ns.getScriptRam("grow.js");
          let rammax = ns.getServerMaxRam("home");
          let usedram = ns.getServerUsedRam("home");
          let threadsmax = (rammax / ramscript) - usedram;
  
          //nombre de growth necessaire pour doubler
          let nb_grow = ns.growthAnalyze(bestServer, 2);
  
  
          if (nb_grow > threadsmax) {
            nb_grow = threadsmax;
          }
  
          ns.run("grow.js", Math.floor(nb_grow), bestServer);
  
        }
      }
      //Début Hack
      if (ns.scriptRunning(bestServer,"home") || ns.getServerMoneyAvailable(bestServer) < (ns.getServerMaxMoney(bestServer) * 0.9) || ns.getServerSecurityLevel(bestServer) > securityThresh) {
        //ns.tprint("skip hack.js")
      }
      else {
        ns.print("Sec =", ns.getServerMinSecurityLevel(bestServer))
        // Defines the maximum security level the target server can
        // have.
        const securityThresh = ns.getServerMinSecurityLevel(bestServer) + 5;
  
        //yield par thread
        let yieldParThread = ns.getServerMoneyAvailable(bestServer) * ns.hackAnalyze(bestServer);
        //ns.tprint("yield par tread", yieldParThread)
        //détermination du montant cible (50%)
        let targetyield = ns.getServerMoneyAvailable(bestServer) - (ns.getServerMaxMoney(bestServer) * 0.5);
        //ns.tprint("variable targetyield pour hack ", ns.formatNumber(targetyield));
  
        //nombre de thread dispo max
        let ramscript = ns.getScriptRam("hack.js");
        //ns.tprint("ramscript pour hack: ", ramscript);
        let rammax = ns.getServerMaxRam("home");
        //ns.tprint("rammax pour hack: ", rammax);
        let usedram = ns.getServerUsedRam("home");
        //ns.tprint("usedram pour hack: ", usedram);
        let threadsmax = (rammax / ramscript) - usedram;
        //ns.tprint("threadsmax :", threadsmax);
  
        //nombre de threads nécessaires pour le targetyield
        let nb_threads = targetyield / yieldParThread
        //ns.tprint("nb_threads idéal :", nb_threads, "(montant a yield: ", ns.formatNumber(targetyield), "/ yield par thread:", ns.formatNumber(yieldParThread));
  
  
  
  
        //lancement du hack
        if (nb_threads > threadsmax) {
          nb_threads = threadsmax;
        }
        //ns.tprint("nombre de threads pour hack ", nb_threads)
        ns.run("hack.js", Math.floor(nb_threads), bestServer);
      }
      await ns.sleep(10000)
    }
  