function(onSuccess, onError, ellipsis) {
  "use strict"; 

const AWS = require('aws-sdk');
const Q = require('q');
const dateFormat = require('dateformat');

AWS.config.update({
  accessKeyId:  ellipsis.env.AWS_ACCESS_KEY,
  secretAccessKey: ellipsis.env.AWS_SECRET_KEY
});

const certsFromIAM = () => {
  const iam = new AWS.IAM();
  const deferred = Q.defer();
  
  iam.listServerCertificates({}, (err, data) => {
    if (err) {
      deferred.reject(err)
      onError(err);
    } else {
      deferred.resolve(
        data.ServerCertificateMetadataList.
          sort((a, b) => {
            return a.Expiration.value - b.Expiration.value;
          }).
          map((ea) => {
            return { identifier: ea.Arn, expiration: ea.Expiration };
          })
        );
    }
  });

  return deferred.promise;
};

const acm = new AWS.ACM();

const certArnsFromACM = () => {
  const deferred = Q.defer();

  acm.listCertificates({}, (err, data) => {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(
        data.CertificateSummaryList.
          map((ea) => {
            return ea.CertificateArn;
          })
        );
    }
  });
  
  return deferred.promise;
};

const eventualCertFromArn = (arn) => {
  const deferred = Q.defer();
  acm.describeCertificate({ CertificateArn: arn }, (err, data) => {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve({ 
        identifier: data.Certificate.DomainName, 
        expiration: data.Certificate.NotAfter
      });
    }
  });
  return deferred.promise;
};

const certsFromACM = () => {
  return certArnsFromACM().then((arns) => {
    return Q.all(arns.map(eventualCertFromArn));
  });
};
   
Q.all([
  certsFromIAM(),
  certsFromACM()
]).then((certLists) => {
  const flattened = [].concat.apply([], certLists);
  const result = flattened.map((ea) => {
    const expirationStr = dateFormat(ea.expiration, "dddd, mmmm dS, yyyy");
    return { identifier: ea.identifier, expiration: expirationStr };
  });
  onSuccess(result);
}).fail((err) => {
  onError(err);
});

}