#!/usr/bin/env node

const GRAPHQL_ENDPOINT = "https://graph.onchainsuperheroes.xyz/v1/graphql";

async function introspectSchema() {
  const query = `
    query IntrospectionQuery {
      __schema {
        queryType {
          name
          fields {
            name
            type {
              name
              kind
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return;
    }

    console.log('Available queries:');
    result.data.__schema.queryType.fields.forEach(field => {
      console.log(`- ${field.name}: ${field.type.name || field.type.kind}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

introspectSchema(); 