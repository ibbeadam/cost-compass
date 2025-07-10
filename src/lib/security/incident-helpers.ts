/**
 * Helper functions for security incident processing
 */

/**
 * Generate incident title based on event type and severity
 */
export function getIncidentTitle(eventType: string, severity: string): string {
  const titleMap: Record<string, string> = {
    'DDOS_ATTACK_DETECTED': 'DDoS Attack Detected',
    'BRUTE_FORCE_ATTACK': 'Brute Force Attack',
    'MULTIPLE_FAILED_LOGINS': 'Multiple Failed Login Attempts',
    'SQL_INJECTION_ATTEMPT': 'SQL Injection Attack',
    'XSS_ATTEMPT': 'Cross-Site Scripting Attack',
    'UNAUTHORIZED_ACCESS_ATTEMPT': 'Unauthorized Access Attempt',
    'PRIVILEGE_ESCALATION': 'Privilege Escalation Detected',
    'DATA_BREACH': 'Potential Data Breach',
    'SUSPICIOUS_IP_ACTIVITY': 'Suspicious IP Activity',
    'MALWARE_DETECTED': 'Malware Detection',
    'POLICY_VIOLATION': 'Security Policy Violation',
    'UNUSUAL_ACCESS_TIME': 'Unusual Access Time Pattern',
    'MULTIPLE_IP_ACCESS': 'Multiple IP Access Pattern',
    'RATE_LIMIT_EXCEEDED': 'Rate Limit Violation',
    'AUTOMATED_BEHAVIOR': 'Automated Behavior Detected',
    'GEOGRAPHIC_ANOMALY': 'Geographic Access Anomaly'
  };

  const baseTitle = titleMap[eventType] || 'Security Event';
  
  if (severity === 'critical') {
    return `🚨 Critical: ${baseTitle}`;
  } else if (severity === 'high') {
    return `⚠️ High Priority: ${baseTitle}`;
  }
  
  return baseTitle;
}

/**
 * Determine root cause based on event type
 */
export function getIncidentRootCause(eventType: string): string {
  const rootCauseMap: Record<string, string> = {
    'DDOS_ATTACK_DETECTED': 'Coordinated distributed denial of service attack from multiple sources',
    'BRUTE_FORCE_ATTACK': 'Automated credential guessing attack targeting user accounts',
    'MULTIPLE_FAILED_LOGINS': 'Repeated invalid login attempts indicating potential credential attack',
    'SQL_INJECTION_ATTEMPT': 'Malicious SQL code injection targeting database vulnerabilities',
    'XSS_ATTEMPT': 'Cross-site scripting attack attempting to inject malicious client-side code',
    'UNAUTHORIZED_ACCESS_ATTEMPT': 'Attempt to access protected resources without proper authorization',
    'PRIVILEGE_ESCALATION': 'Attempt to gain elevated privileges beyond authorized access level',
    'DATA_BREACH': 'Unauthorized access or exfiltration of sensitive data',
    'SUSPICIOUS_IP_ACTIVITY': 'Unusual or malicious activity patterns from specific IP addresses',
    'MALWARE_DETECTED': 'Malicious software detected in system or user uploads',
    'POLICY_VIOLATION': 'User or system behavior violating established security policies',
    'UNUSUAL_ACCESS_TIME': 'Access patterns outside normal business hours or user behavior',
    'MULTIPLE_IP_ACCESS': 'User account accessed from multiple geographic locations',
    'RATE_LIMIT_EXCEEDED': 'Excessive requests indicating potential automated abuse',
    'AUTOMATED_BEHAVIOR': 'Bot-like behavior patterns detected in user interactions',
    'GEOGRAPHIC_ANOMALY': 'Access from unexpected or high-risk geographic locations'
  };

  return rootCauseMap[eventType] || 'Security event requiring investigation';
}

/**
 * Get preventive measures based on event type
 */
export function getPreventiveMeasures(eventType: string): string[] {
  const measuresMap: Record<string, string[]> = {
    'DDOS_ATTACK_DETECTED': [
      'Implement DDoS protection and traffic filtering',
      'Configure rate limiting on critical endpoints',
      'Set up CDN and load balancing',
      'Monitor traffic patterns for early detection'
    ],
    'BRUTE_FORCE_ATTACK': [
      'Implement account lockout policies',
      'Enable multi-factor authentication',
      'Use CAPTCHA for repeated failed attempts',
      'Monitor and block suspicious IP addresses'
    ],
    'MULTIPLE_FAILED_LOGINS': [
      'Strengthen password policies',
      'Implement progressive delays for failed attempts',
      'Enable account monitoring and alerts',
      'Educate users on password security'
    ],
    'SQL_INJECTION_ATTEMPT': [
      'Use parameterized queries and prepared statements',
      'Implement input validation and sanitization',
      'Apply principle of least privilege for database access',
      'Regular security code reviews and testing'
    ],
    'XSS_ATTEMPT': [
      'Implement Content Security Policy (CSP)',
      'Use input validation and output encoding',
      'Sanitize user-generated content',
      'Regular security scanning and testing'
    ],
    'UNAUTHORIZED_ACCESS_ATTEMPT': [
      'Review and strengthen access controls',
      'Implement role-based access control (RBAC)',
      'Regular access audits and reviews',
      'Monitor and log all access attempts'
    ],
    'PRIVILEGE_ESCALATION': [
      'Implement least privilege principle',
      'Regular privilege reviews and audits',
      'Segregation of duties for critical operations',
      'Monitor privilege changes and escalations'
    ],
    'DATA_BREACH': [
      'Implement data encryption at rest and in transit',
      'Data loss prevention (DLP) tools',
      'Access monitoring and data classification',
      'Regular backup and recovery testing'
    ],
    'SUSPICIOUS_IP_ACTIVITY': [
      'Implement IP reputation checking',
      'Geographic access controls',
      'Real-time IP monitoring and blocking',
      'Integration with threat intelligence feeds'
    ],
    'MALWARE_DETECTED': [
      'Deploy endpoint detection and response (EDR)',
      'Regular antivirus updates and scans',
      'File upload scanning and sandboxing',
      'User education on malware threats'
    ],
    'POLICY_VIOLATION': [
      'Regular policy training and awareness',
      'Clear documentation of security policies',
      'Automated policy enforcement where possible',
      'Regular policy reviews and updates'
    ],
    'UNUSUAL_ACCESS_TIME': [
      'Implement time-based access controls',
      'Monitor and alert on off-hours access',
      'Require additional verification for unusual times',
      'Regular review of access patterns'
    ],
    'MULTIPLE_IP_ACCESS': [
      'Implement device trust and registration',
      'Geographic access controls and alerts',
      'Session management and concurrent login limits',
      'User notification of new device access'
    ],
    'RATE_LIMIT_EXCEEDED': [
      'Implement comprehensive rate limiting',
      'Monitor API usage patterns',
      'Use progressive rate limiting strategies',
      'Implement request throttling and queuing'
    ],
    'AUTOMATED_BEHAVIOR': [
      'Implement CAPTCHA and bot detection',
      'Behavioral analysis and machine learning',
      'Request pattern analysis',
      'Human verification for suspicious activity'
    ],
    'GEOGRAPHIC_ANOMALY': [
      'Implement geographic access controls',
      'VPN and proxy detection',
      'Location-based risk scoring',
      'User notification and verification for new locations'
    ]
  };

  return measuresMap[eventType] || [
    'Investigate the security event thoroughly',
    'Review and update security policies',
    'Implement additional monitoring',
    'Conduct security awareness training'
  ];
}

/**
 * Determine incident priority based on type and severity
 */
export function getIncidentPriority(eventType: string, severity: string): 'low' | 'medium' | 'high' | 'critical' {
  if (severity === 'critical') return 'critical';
  
  const highPriorityTypes = [
    'DDOS_ATTACK_DETECTED',
    'SQL_INJECTION_ATTEMPT',
    'DATA_BREACH',
    'PRIVILEGE_ESCALATION',
    'MALWARE_DETECTED'
  ];
  
  const mediumPriorityTypes = [
    'BRUTE_FORCE_ATTACK',
    'XSS_ATTEMPT',
    'UNAUTHORIZED_ACCESS_ATTEMPT',
    'SUSPICIOUS_IP_ACTIVITY'
  ];
  
  if (highPriorityTypes.includes(eventType)) return 'high';
  if (mediumPriorityTypes.includes(eventType)) return 'medium';
  
  return severity === 'high' ? 'high' : 'medium';
}

/**
 * Generate response recommendations based on event type
 */
export function getResponseRecommendations(eventType: string, severity: string): string[] {
  const recommendations: Record<string, string[]> = {
    'DDOS_ATTACK_DETECTED': [
      'Activate DDoS mitigation immediately',
      'Block attacking IP ranges',
      'Scale up infrastructure if needed',
      'Contact hosting provider if attack persists'
    ],
    'BRUTE_FORCE_ATTACK': [
      'Lock affected user accounts immediately',
      'Block attacking IP addresses',
      'Review account security policies',
      'Notify affected users'
    ],
    'SQL_INJECTION_ATTEMPT': [
      'Block malicious IP immediately',
      'Review and patch vulnerable endpoints',
      'Audit database access logs',
      'Run security scans on affected systems'
    ],
    'XSS_ATTEMPT': [
      'Block malicious requests',
      'Review input validation on affected endpoints',
      'Check for successful XSS exploitation',
      'Update Content Security Policy'
    ],
    'DATA_BREACH': [
      'Isolate affected systems immediately',
      'Assess scope of data compromise',
      'Notify legal and compliance teams',
      'Prepare breach notification procedures'
    ]
  };
  
  return recommendations[eventType] || [
    'Investigate the incident immediately',
    'Document all findings',
    'Implement containment measures',
    'Review security controls'
  ];
}