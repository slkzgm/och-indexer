async function checkWeaponFields() {
  const url = "https://graph.onchainsuperheroes.xyz/v1/graphql";
  
  const query = `
    query IntrospectWeapon {
      __type(name: "Weapon") {
        fields {
          name
          type {
            name
            kind
          }
        }
      }
    }
  `;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });
    
    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL Errors:', data.errors);
      return;
    }
    
    console.log('=== WEAPON FIELDS ===');
    data.data.__type.fields.forEach(field => {
      console.log(`${field.name}: ${field.type.name || field.type.kind}`);
    });
    
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Utilisation
checkWeaponFields(); 