# Licenza e attribuzione del dizionario italiano (it.txt.gz)

Il file `it.txt.gz` è un elenco di parole con punteggio, generato dalla pipeline `tools/wordlist/build.mjs` di questo repository. È un'opera derivata dalle sorgenti seguenti.

La copertura delle forme flesse proviene da **Morph-it! 0.48**, lessico morfologico dell'italiano di Marco Baroni ed Eros Zanchetta (Università di Bologna), distribuito con doppia licenza Creative Commons Attribution-ShareAlike 2.0 e LGPL. Pagina del progetto: https://docs.sslmit.unibo.it/doku.php?id=resources:morph-it

I punteggi di frequenza derivano dalle **liste di frequenza itWaC** del repository `franfranz/Word_Frequency_Lists_ITA` (https://github.com/franfranz/Word_Frequency_Lists_ITA), licenza MIT.

In forza della clausola share-alike della sorgente principale, questo elenco derivato è distribuito a sua volta con licenza **Creative Commons Attribution-ShareAlike 2.0** (https://creativecommons.org/licenses/by-sa/2.0/). L'attribuzione richiesta è agli autori di Morph-it! indicati sopra. Questa licenza riguarda il solo file di dati: il codice del progetto resta sotto licenza MIT come da file `LICENSE` nella radice del repository.

L'elenco si rigenera con `npm run wordlist`; le voci curate a mano vivono in `tools/wordlist/extra-short.txt` e le esclusioni in `tools/wordlist/blocklist.txt`.
