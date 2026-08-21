# CondoFácil — primeira versão

Aplicação web responsiva para moradores registrarem problemas no condomínio.

## Funcionalidades

- Cadastro e login com Firebase Authentication
- Cadastro básico do morador no Firestore
- Formulário de ocorrência
- Upload opcional de foto no Firebase Storage
- Lista em tempo real dos próprios registros
- Filtro por status
- Contadores de registros, abertos e resolvidos
- Layout adaptado para celular

## Configuração

1. Crie um projeto no Firebase Console.
2. Ative:
   - Authentication > Sign-in method > E-mail/senha
   - Firestore Database
   - Storage
3. Adicione um aplicativo Web e copie a configuração.
4. Abra `app.js` e substitua os valores de `firebaseConfig`.
5. Execute usando um servidor local, não abrindo o HTML diretamente.

Exemplo com VS Code:
- Instale a extensão Live Server.
- Clique com o botão direito em `index.html`.
- Escolha "Open with Live Server".

## Regras iniciais do Firestore

Use estas regras apenas como ponto de partida e revise-as antes de publicar:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /reports/{reportId} {
      allow create: if request.auth != null
        && request.resource.data.moradorId == request.auth.uid;

      allow read: if request.auth != null
        && resource.data.moradorId == request.auth.uid;

      allow update: if request.auth != null
        && resource.data.moradorId == request.auth.uid;

      allow delete: if false;
    }
  }
}
```

## Regras iniciais do Storage

```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /ocorrencias/{userId}/{fileName} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## Observação

A consulta de registros usa `where` combinado com `orderBy`. O Firebase pode solicitar a criação de um índice composto; nesse caso, clique no link exibido no erro do console para criá-lo automaticamente.
