& az group create -n mzaks -l centralus
& az aks create -n mzakscluster -g mzaks --generate-ssh-keys
& az aks get-credentials -n mzakscluster -g mzaks
