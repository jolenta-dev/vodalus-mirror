#What is Vodalus running off of?

After an insane run of luck, I happened into a Xeon VM host at work. Vodalus (and the vodalus media server) now have their own dedicated VMs running a Proxmox cluster. Specs:

Proxmox host:
- CPU: Intel(R) Xeon(R) D-2143IT CPU @ 2.20GHz
- RAM: 64GB DDR4
- GPU: Nvidia Tesla P9 (coming soon TM)

Vodalus VM:
- CPU: 2 CPU Cores
- RAM: 8GB DDR4
- OS: Arch Linux (LTS)

I have a Cisco ISR-4431 (did I mention I love enterprise networking?) working as my main router, uplinked to two Cisco Catalyst 2960X switches that do distribution. There's a double NAT happening and a pretty involved list of ACLs (good luck) since I run this on my personal IP. A Pi 4B 8GB runs DNS and a Tor bridge and some other light services.
