INSERT INTO public.profiles (id, email, organization_id)
VALUES (gen_random_uuid(), 'teste@example.com',
        (SELECT id FROM public.organizations WHERE name = 'Organização Teste'));
